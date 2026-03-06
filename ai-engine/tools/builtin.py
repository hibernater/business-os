"""
平台内置 Tool：查企业资产、时间计算、数据格式化等。
启动时自动注册到 Tool Registry。
"""

from __future__ import annotations
import json
from datetime import datetime, timedelta

import httpx

from config import JAVA_BACKEND_URL
from tools.registry import register_tool


async def query_enterprise_assets(params: dict) -> str:
    """查询企业资产数据"""
    enterprise_id = params.get("enterprise_id", "")
    asset_type = params.get("asset_type", "")
    if not enterprise_id:
        return "[无企业ID，跳过资产查询]"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            url = f"{JAVA_BACKEND_URL}/api/internal/assets"
            query = {"enterpriseId": enterprise_id}
            if asset_type:
                query["type"] = asset_type
            resp = await client.get(url, params=query)
            if resp.status_code == 200:
                data = resp.json()
                assets = data.get("assets", [])
                if not assets:
                    return "暂无企业资产数据"
                lines = []
                for a in assets[:20]:
                    line = f"- [{a.get('assetType', '')}] {a.get('name', '')}"
                    if a.get("content"):
                        line += f": {a['content'][:80]}"
                    lines.append(line)
                return "\n".join(lines)
            return f"查询失败: HTTP {resp.status_code}"
    except Exception as e:
        return f"查询失败: {str(e)}"


async def query_execution_history(params: dict) -> str:
    """查询 Skill 执行历史"""
    enterprise_id = params.get("enterprise_id", "")
    skill_id = params.get("skill_id", "")
    limit = int(params.get("limit", 5))

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{JAVA_BACKEND_URL}/api/internal/assets",
                params={"enterpriseId": enterprise_id},
            )
            if resp.status_code == 200:
                assets = resp.json().get("assets", [])
                records = [
                    a for a in assets
                    if a.get("assetType") == "execution_record"
                    and (not skill_id or a.get("sourceSkillId") == skill_id)
                ][:limit]
                if not records:
                    return "暂无执行记录"
                lines = []
                for r in records:
                    lines.append(f"- {r.get('name', '')} ({r.get('createdAt', '')[:10]})")
                return "\n".join(lines)
            return "查询失败"
    except Exception as e:
        return f"查询失败: {str(e)}"


async def get_current_time(params: dict) -> str:
    """获取当前时间信息"""
    fmt = params.get("format", "full")
    now = datetime.now()
    if fmt == "date":
        return now.strftime("%Y-%m-%d")
    if fmt == "time":
        return now.strftime("%H:%M:%S")
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    return f"{now.strftime('%Y-%m-%d %H:%M')} {weekdays[now.weekday()]}"


async def calculate(params: dict) -> str:
    """安全的数学计算"""
    expression = params.get("expression", "")
    if not expression:
        return "未提供计算表达式"
    allowed = set("0123456789+-*/.() ")
    if not all(c in allowed for c in expression):
        return "表达式包含不允许的字符"
    try:
        result = eval(expression)  # noqa: S307 - restricted to numeric chars
        return str(result)
    except Exception as e:
        return f"计算错误: {str(e)}"


async def format_table(params: dict) -> str:
    """将 JSON 数据格式化为 Markdown 表格"""
    headers = params.get("headers", [])
    rows = params.get("rows", [])
    if not headers or not rows:
        return "未提供表头或数据行"

    lines = ["| " + " | ".join(str(h) for h in headers) + " |"]
    lines.append("| " + " | ".join("---" for _ in headers) + " |")
    for row in rows:
        cells = [str(row.get(h, row[i]) if isinstance(row, dict) else row[i]) for i, h in enumerate(headers)]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def register_builtin_tools():
    """注册所有内置 Tool"""
    register_tool(
        name="query_assets",
        description="查询企业资产数据（产品、客户、供应商等）",
        func=query_enterprise_assets,
        category="builtin",
        param_schema={"enterprise_id": "企业ID", "asset_type": "资产类型(可选)"},
    )
    register_tool(
        name="query_history",
        description="查询 Skill 执行历史",
        func=query_execution_history,
        category="builtin",
        param_schema={"enterprise_id": "企业ID", "skill_id": "Skill ID(可选)", "limit": "数量限制"},
    )
    register_tool(
        name="current_time",
        description="获取当前日期和时间",
        func=get_current_time,
        category="builtin",
        param_schema={"format": "格式: full/date/time"},
    )
    register_tool(
        name="calculate",
        description="数学计算",
        func=calculate,
        category="builtin",
        param_schema={"expression": "数学表达式"},
    )
    register_tool(
        name="format_table",
        description="将数据格式化为 Markdown 表格",
        func=format_table,
        category="builtin",
        param_schema={"headers": "表头列表", "rows": "数据行列表"},
    )
