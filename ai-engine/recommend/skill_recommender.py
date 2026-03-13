"""基于企业资产智能推荐 Skill"""

from __future__ import annotations
import httpx
from config import JAVA_BACKEND_URL
from runner.skill_loader import load_all_preset_skills


SKILL_ASSET_RULES: list[dict] = [
    {
        "skill_id": "pricing_strategy",
        "triggers": [
            {"has_type": "product", "min_count": 1, "missing_type": None, "reason": "你有 {count} 个商品，但还没做过定价分析，定价策略能帮你找到最优价格"},
        ],
    },
    {
        "skill_id": "new_product_plan",
        "triggers": [
            {"has_type": "product", "min_count": 2, "missing_type": None, "reason": "你有 {count} 个在售商品，选品分析能帮你发现新品机会"},
            {"has_type": None, "min_count": 0, "missing_type": "product", "reason": "还没有商品数据，先做一次选品分析，AI 帮你找到适合的品"},
        ],
    },
    {
        "skill_id": "customer_segmentation",
        "triggers": [
            {"has_type": "customer", "min_count": 1, "missing_type": None, "reason": "你有 {count} 个客户记录，客户分群能帮你做精准运营、提升复购"},
        ],
    },
    {
        "skill_id": "refund_analysis",
        "triggers": [
            {"has_type": "product", "min_count": 3, "missing_type": None, "reason": "你有 {count} 个商品，退款分析能帮你找到品质问题、降低退款率"},
        ],
    },
    {
        "skill_id": "inquiry_daily",
        "triggers": [
            {"has_type": None, "min_count": 0, "missing_type": None, "reason": "每天花 1 分钟看经营日报，快速了解今天生意情况"},
        ],
    },
]


async def get_recommendations(enterprise_id: str) -> list[dict]:
    """根据企业资产情况推荐 Skill"""
    asset_counts: dict[str, int] = {}
    executed_skills: set[str] = set()

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{JAVA_BACKEND_URL}/api/internal/assets",
                params={"enterpriseId": enterprise_id},
            )
            if resp.status_code == 200:
                assets = resp.json().get("assets", [])
                for a in assets:
                    t = a.get("assetType", "")
                    asset_counts[t] = asset_counts.get(t, 0) + 1
                    if t == "execution_record":
                        try:
                            import json
                            content = json.loads(a.get("content", "{}"))
                            if "skill" in content:
                                executed_skills.add(content["skill"])
                        except Exception:
                            pass
    except Exception:
        pass

    skills = load_all_preset_skills()
    recommendations = []

    for rule in SKILL_ASSET_RULES:
        skill_id = rule["skill_id"]
        if skill_id not in skills:
            continue
        skill = skills[skill_id]

        for trigger in rule["triggers"]:
            has_type = trigger.get("has_type")
            min_count = trigger.get("min_count", 0)
            missing_type = trigger.get("missing_type")

            matched = False
            count = 0

            if has_type:
                count = asset_counts.get(has_type, 0)
                if count >= min_count:
                    matched = True
            elif missing_type:
                if asset_counts.get(missing_type, 0) == 0:
                    matched = True
                    count = 0
            else:
                matched = True

            if matched:
                reason = trigger["reason"].format(count=count)
                priority = 2 if skill_id in executed_skills else 1

                recommendations.append({
                    "skill_id": skill_id,
                    "name": skill.name,
                    "description": skill.description,
                    "reason": reason,
                    "priority": priority,
                    "icon": skill.icon,
                    "usage_count": skill.usage_count,
                    "quick_setup": [
                        {"question": qs.question, "field": qs.field, "options": qs.options}
                        for qs in skill.quick_setup
                    ],
                })
                break

    recommendations.sort(key=lambda r: r["priority"])
    return recommendations[:3]
