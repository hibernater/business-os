"""
企业上下文服务：从 Java 后端获取企业资产、偏好、历史记录，
注入到 Skill 执行上下文中。
"""

from __future__ import annotations
import httpx
from config import JAVA_BACKEND_URL


async def fetch_enterprise_context(enterprise_id: str, skill_id: str = "") -> dict:
    """
    获取企业上下文数据，用于注入 Skill prompt。
    包括：企业资产摘要、保存的偏好、最近执行记录。
    """
    context = {
        "assets_summary": "",
        "saved_preferences": {},
        "recent_executions": [],
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # 获取企业资产（内部调用，不需要 JWT）
            assets_resp = await client.get(
                f"{JAVA_BACKEND_URL}/api/internal/assets",
                params={"enterpriseId": enterprise_id},
            )
            if assets_resp.status_code == 200:
                data = assets_resp.json()
                assets = data.get("assets", [])
                if assets:
                    context["assets_summary"] = _format_assets(assets)

            # 获取保存的偏好
            prefs_resp = await client.get(
                f"{JAVA_BACKEND_URL}/api/internal/memory",
                params={"enterpriseId": enterprise_id, "skillId": skill_id},
            )
            if prefs_resp.status_code == 200:
                data = prefs_resp.json()
                context["saved_preferences"] = data.get("preferences", {})
                context["recent_executions"] = data.get("recentExecutions", [])

    except Exception:
        pass

    return context


def _format_assets(assets: list[dict]) -> str:
    if not assets:
        return "暂无企业资产数据"

    by_type: dict[str, list[str]] = {}
    type_labels = {
        "product": "商品", "customer": "客户", "supplier": "供应商",
        "document": "文档", "preference": "偏好设置",
    }
    for a in assets[:30]:
        t = type_labels.get(a.get("assetType", ""), a.get("assetType", "其他"))
        by_type.setdefault(t, []).append(
            f"  - {a['name']}" + (f"：{a['content'][:100]}" if a.get("content") else "")
        )

    parts = ["【企业资产数据】"]
    for label, items in by_type.items():
        parts.append(f"\n{label}（{len(items)}条）：")
        parts.extend(items[:10])
        if len(items) > 10:
            parts.append(f"  ...等共{len(items)}条")

    return "\n".join(parts)
