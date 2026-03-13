"""文档智能分析 → Skill 推荐生成"""

from __future__ import annotations
from runner.skill_loader import load_all_preset_skills


DOCUMENT_SKILL_MAP = [
    {
        "keywords": ["价格", "售价", "成本", "毛利", "定价", "竞品价", "price", "cost"],
        "skill_id": "pricing_strategy",
        "reason": "检测到价格/成本相关数据，可以生成「智能定价策略」帮你科学定价",
    },
    {
        "keywords": ["产品", "商品", "SKU", "品类", "新品", "选品", "product", "sku"],
        "skill_id": "new_product_plan",
        "reason": "检测到商品/产品数据，可以生成「新品开发方案」帮你做选品分析",
    },
    {
        "keywords": ["客户", "买家", "顾客", "复购", "分群", "customer", "buyer"],
        "skill_id": "customer_segmentation",
        "reason": "检测到客户相关数据，可以生成「客户分群运营」帮你精准运营",
    },
    {
        "keywords": ["退款", "退货", "退单", "售后", "refund", "return"],
        "skill_id": "refund_analysis",
        "reason": "检测到退款/退货数据，可以生成「退款退货分析」帮你降低退款率",
    },
    {
        "keywords": ["订单", "营收", "销售额", "日报", "数据", "revenue", "order", "sales"],
        "skill_id": "inquiry_daily",
        "reason": "检测到经营数据，可以生成「每日经营看板」帮你每天快速了解生意",
    },
]


async def analyze_document(content: str, filename: str) -> list[dict]:
    """分析文档内容，推荐可生成的 Skill"""
    skills = load_all_preset_skills()
    suggestions = []
    seen_skills = set()

    combined = (content[:3000] + " " + filename).lower()

    for mapping in DOCUMENT_SKILL_MAP:
        skill_id = mapping["skill_id"]
        if skill_id in seen_skills or skill_id not in skills:
            continue

        match_count = sum(1 for kw in mapping["keywords"] if kw.lower() in combined)
        if match_count >= 1:
            skill = skills[skill_id]
            suggestions.append({
                "skill_id": skill_id,
                "name": skill.name,
                "description": skill.description,
                "reason": mapping["reason"],
                "match_score": match_count,
                "icon": skill.icon,
                "quick_setup": [
                    {"question": qs.question, "field": qs.field, "options": qs.options}
                    for qs in skill.quick_setup
                ],
            })
            seen_skills.add(skill_id)

    suggestions.sort(key=lambda s: s["match_score"], reverse=True)
    return suggestions[:3]


async def generate_skill_from_wizard(
    scene: str,
    answers: dict[str, str],
    llm=None,
) -> dict:
    """引导式创建：基于场景+答案快速生成 Skill"""
    skills = load_all_preset_skills()

    SCENE_SKILL_MAP = {
        "选品分析": "new_product_plan",
        "定价策略": "pricing_strategy",
        "客户运营": "customer_segmentation",
        "退款分析": "refund_analysis",
        "经营复盘": "inquiry_daily",
    }

    skill_id = SCENE_SKILL_MAP.get(scene)
    if skill_id and skill_id in skills:
        skill = skills[skill_id]
        return {
            "status": "ok",
            "mode": "preset_match",
            "skill_id": skill_id,
            "name": skill.name,
            "description": skill.description,
            "step_count": skill.step_count,
            "steps": [{"name": s.name, "description": s.description} for s in skill.steps],
            "customization": answers,
        }

    if llm:
        from llm.base import ChatMessage
        prompt = f"""用户想创建一个经营分析 Skill。
场景：{scene}
用户回答：{answers}

请生成一个简洁的 Skill 定义，包含：
1. skill_id（英文下划线）
2. name（中文名称）
3. description（一句话描述）
4. 3-4 个执行步骤（name + description）

用 JSON 格式返回。"""

        messages = [
            ChatMessage(role="system", content="你是一个 Skill 配置专家。输出 JSON。"),
            ChatMessage(role="user", content=prompt),
        ]
        response = await llm.chat(messages)
        return {
            "status": "ok",
            "mode": "ai_generated",
            "raw": response.content,
            "customization": answers,
        }

    return {
        "status": "ok",
        "mode": "custom_placeholder",
        "name": f"自定义-{scene}",
        "description": f"基于「{scene}」场景创建的自定义 Skill",
        "customization": answers,
    }
