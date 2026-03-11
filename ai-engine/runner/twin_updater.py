"""
数字孪生回写模块

Skill 执行完成后，基于输出内容提取结构化指标，
回写到 Java 后端的 enterprise_state 对应维度。

这是让"执行 → 积累 → 洞察"飞轮转起来的关键模块。
"""

from __future__ import annotations
import json
import logging
from datetime import datetime

import httpx

from config import JAVA_BACKEND_URL
from runner.skill_schema import SkillDefinition, SkillExecutionContext, StepStatus

logger = logging.getLogger(__name__)


def _build_extraction_prompt(skill: SkillDefinition, full_output: str) -> str:
    """构造从 Skill 输出中提取结构化数据的 prompt"""
    dim_descriptions = []
    for td in skill.twin_dimensions:
        keys_str = ", ".join(td.extract_keys)
        dim_descriptions.append(f'维度 "{td.dimension}"，需要提取的字段: [{keys_str}]')

    dims_text = "\n".join(dim_descriptions)

    return f"""你是一个数据提取专家。以下是一个名为「{skill.name}」的 Skill 执行后的完整输出。

请从中提取结构化数据，用于更新企业数字孪生。

需要提取的维度和字段：
{dims_text}

Skill 执行输出内容：
---
{full_output[:3000]}
---

请输出一个 JSON 对象，格式如下（只输出 JSON，不要其他内容）：
{{
  "维度名": {{
    "字段名": "提取到的值（数字用数字类型，没有数据的字段用 null）",
    ...
  }},
  ...
}}

注意：
- 值尽量用数字或简短文字
- 列表类的值（如 top_refund_reasons）用数组
- 没找到的数据填 null
- 标注了【模拟数据】的值也要提取，加个 "_simulated": true 标记"""


def _extract_structured_data_simple(skill: SkillDefinition, ctx: SkillExecutionContext) -> dict[str, dict]:
    """
    不依赖 LLM 的简单提取：基于执行结果生成维度更新数据。
    每次执行都会记录一些基本信息，确保数字孪生有数据流入。
    """
    full_output = ctx.get_previous_results_summary()
    now = datetime.now().isoformat()
    result: dict[str, dict] = {}

    for td in skill.twin_dimensions:
        dim_data: dict = {}

        dim_data["last_skill_run"] = skill.name
        dim_data["last_run_at"] = now
        dim_data["last_skill_id"] = skill.skill_id

        completed = sum(1 for r in ctx.step_results.values() if r.status == StepStatus.COMPLETED)
        dim_data["last_run_steps_completed"] = completed
        dim_data["last_run_steps_total"] = skill.step_count

        output_len = len(full_output)
        dim_data["data_richness"] = "high" if output_len > 2000 else "medium" if output_len > 500 else "low"

        for key in td.extract_keys:
            dim_data[key] = _try_extract_value(key, full_output)

        run_count_key = f"{skill.skill_id}_run_count"
        dim_data[run_count_key] = "+1"

        result[td.dimension] = dim_data

    return result


def _try_extract_value(key: str, text: str) -> str | int | float | None:
    """尝试从文本中简单提取指标值"""
    import re

    key_patterns = {
        "refund_rate": [r"退款率[：:]\s*([\d.]+%)", r"退款率.*?([\d.]+)%"],
        "daily_revenue": [r"营收[：:]\s*[¥￥]?([\d,.]+)", r"GMV[：:]\s*[¥￥]?([\d,.]+)"],
        "daily_orders": [r"订单[数量]*[：:]\s*([\d,]+)", r"([\d,]+)\s*单"],
        "conversion_rate": [r"转化率[：:]\s*([\d.]+%)", r"转化率.*?([\d.]+)%"],
        "total_customers": [r"客户[数总量]*[：:]\s*([\d,]+)", r"([\d,]+)\s*[个位名]客户"],
        "repeat_purchase_rate": [r"复购率[：:]\s*([\d.]+%)", r"复购率.*?([\d.]+)%"],
        "recommended_price": [r"建议[零售售]*价[：:]\s*[¥￥]?([\d,.]+)"],
        "margin_rate": [r"毛利率[：:]\s*([\d.]+%)", r"利润率.*?([\d.]+)%"],
        "daily_score": [r"评分[：:]\s*([\d.]+)", r"([\d.]+)\s*分"],
    }

    patterns = key_patterns.get(key, [])
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)

    return None


async def extract_with_llm(llm, skill: SkillDefinition, ctx: SkillExecutionContext) -> dict[str, dict]:
    """使用 LLM 从 Skill 输出中提取结构化数据（更准确但需要 LLM）"""
    from llm.base import ChatMessage

    full_output = ctx.get_previous_results_summary()
    if not full_output or not skill.twin_dimensions:
        return {}

    prompt = _build_extraction_prompt(skill, full_output)
    try:
        response = await llm.chat([
            ChatMessage(role="system", content="你是数据提取专家，只输出 JSON。"),
            ChatMessage(role="user", content=prompt),
        ])

        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        return json.loads(text)
    except Exception as e:
        logger.warning(f"LLM extraction failed, falling back to simple: {e}")
        return _extract_structured_data_simple(skill, ctx)


async def update_digital_twin(
    enterprise_id: str,
    skill: SkillDefinition,
    ctx: SkillExecutionContext,
    llm=None,
) -> bool:
    """
    Skill 执行完成后的数字孪生回写入口。
    1. 提取结构化数据
    2. POST 到 Java 后端更新 enterprise_state
    """
    if not skill.twin_dimensions:
        return False

    if llm:
        extracted = await extract_with_llm(llm, skill, ctx)
    else:
        extracted = _extract_structured_data_simple(skill, ctx)

    if not extracted:
        return False

    logger.info(f"Twin update for enterprise={enterprise_id} skill={skill.skill_id}: dims={list(extracted.keys())}")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{JAVA_BACKEND_URL}/api/internal/twin/update",
                json={
                    "enterpriseId": enterprise_id,
                    "skillId": skill.skill_id,
                    "skillName": skill.name,
                    "dimensions": extracted,
                },
            )
            if resp.status_code == 200:
                logger.info(f"Twin updated successfully for {enterprise_id}")
                return True
            else:
                logger.warning(f"Twin update failed: {resp.status_code}")
                return False
    except Exception as e:
        logger.error(f"Twin update error: {e}")
        return False
