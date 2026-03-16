"""
Workflow Decomposer: natural language → structured workflow definition.

Takes a user's description of a business process and decomposes it into
a DAG of Skill nodes with edges and optional conditions.
"""

import json
import uuid
from dataclasses import dataclass, field

AVAILABLE_SKILLS = {
    "pricing_strategy": {"name": "智能定价策略", "desc": "分析竞品和成本，给出定价方案"},
    "product_selection": {"name": "爆款选品分析", "desc": "分析市场趋势，筛选潜力商品"},
    "customer_analysis": {"name": "客户分群分析", "desc": "分析客户数据，识别高价值客户"},
    "daily_operations_report": {"name": "每日经营日报", "desc": "汇总昨日经营数据，生成日报"},
    "refund_monitor": {"name": "退款预警监控", "desc": "监控退款率，分析退款原因"},
    "fetch_platform_data": {"name": "拉取平台数据", "desc": "从电商平台拉取最新经营数据"},
    "generate_summary": {"name": "生成汇总报告", "desc": "汇总分析结果，生成可读报告"},
    "competitor_monitor": {"name": "竞品监控", "desc": "爬取竞品价格和动态"},
    "inventory_check": {"name": "库存盘点", "desc": "检查库存状态，预警缺货"},
}

DECOMPOSE_PROMPT = """你是一个企业工作流设计专家。用户会用自然语言描述一个业务流程，你需要把它拆解成一个工作流。

可用的原子 Skill（只能用这些，不能编造）:
{skills_list}

请把用户的描述拆解为一个工作流，输出严格的 JSON 格式：
{{
  "name": "工作流名称（简短）",
  "description": "一句话描述这个工作流的目的",
  "trigger_type": "manual 或 scheduled",
  "cron_expr": "如果是 scheduled，给出 cron 表达式，否则为 null",
  "nodes": [
    {{
      "id": "node_1",
      "type": "skill",
      "label": "节点显示名",
      "skill_id": "对应的 skill_id",
      "config": {{}}
    }},
    {{
      "id": "node_2",
      "type": "condition",
      "label": "条件判断描述",
      "skill_id": null,
      "config": {{"expression": "条件表达式描述"}}
    }}
  ],
  "edges": [
    {{"id": "e1", "from": "node_1", "to": "node_2", "condition": null}},
    {{"id": "e2", "from": "node_2", "to": "node_3", "condition": "满足条件时"}}
  ]
}}

规则：
1. 每个 skill 节点必须对应 AVAILABLE_SKILLS 中的一个 skill_id
2. 如果用户描述中有条件判断（如"如果...就..."），用 type="condition" 节点
3. 节点按执行顺序排列
4. 如果找不到完全匹配的 Skill，用最接近的
5. 只输出 JSON，不要其他文字

用户描述：{description}"""


def _build_skills_list() -> str:
    lines = []
    for sid, info in AVAILABLE_SKILLS.items():
        lines.append(f"- {sid}: {info['name']} — {info['desc']}")
    return "\n".join(lines)


async def decompose_workflow(description: str, llm=None) -> dict:
    """Decompose a natural language description into a workflow structure."""

    if llm:
        return await _llm_decompose(description, llm)
    return _rule_decompose(description)


async def _llm_decompose(description: str, llm) -> dict:
    """Use LLM to decompose the workflow."""
    from llm.base import ChatMessage

    prompt = DECOMPOSE_PROMPT.format(
        skills_list=_build_skills_list(),
        description=description,
    )

    try:
        response = await llm.chat([ChatMessage(role="user", content=prompt)])
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(text)
        _assign_ids(result)
        return {"status": "ok", "workflow": result, "mode": "llm"}
    except Exception as e:
        fallback = _rule_decompose(description)
        fallback["llm_error"] = str(e)
        return fallback


def _rule_decompose(description: str) -> dict:
    """Rule-based fallback: keyword matching to build a simple workflow."""
    desc = description.lower()
    nodes = []
    edges = []

    keyword_skills = [
        (["日报", "每天", "经营数据", "昨天", "昨日"], "daily_operations_report"),
        (["定价", "价格", "成本", "利润"], "pricing_strategy"),
        (["选品", "爆款", "新品", "趋势"], "product_selection"),
        (["客户", "分群", "复购", "VIP"], "customer_analysis"),
        (["退款", "退货", "售后"], "refund_monitor"),
        (["竞品", "竞争", "对手"], "competitor_monitor"),
        (["库存", "缺货", "补货"], "inventory_check"),
        (["数据", "拉取", "平台", "同步"], "fetch_platform_data"),
    ]

    matched_skills = []
    for keywords, skill_id in keyword_skills:
        if any(kw in desc for kw in keywords):
            matched_skills.append(skill_id)

    if not matched_skills:
        matched_skills = ["daily_operations_report"]

    # Detect conditions
    has_condition = any(kw in desc for kw in ["如果", "当", "超过", "低于", "大于", "小于"])

    for i, sid in enumerate(matched_skills):
        info = AVAILABLE_SKILLS.get(sid, {"name": sid})
        node_id = f"node_{i + 1}"
        nodes.append({
            "id": node_id,
            "type": "skill",
            "label": info.get("name", sid),
            "skill_id": sid,
            "config": {},
        })

        if has_condition and i == 0 and len(matched_skills) > 1:
            cond_id = f"cond_{i + 1}"
            nodes.append({
                "id": cond_id,
                "type": "condition",
                "label": "检查指标是否异常",
                "skill_id": None,
                "config": {"expression": "根据上一步结果判断"},
            })
            edges.append({"id": f"e{len(edges)+1}", "from": node_id, "to": cond_id, "condition": None})
            edges.append({"id": f"e{len(edges)+1}", "from": cond_id, "to": f"node_{i + 2}", "condition": "异常时"})
        elif i > 0:
            prev_id = nodes[-2]["id"] if nodes[-2]["type"] != "condition" else nodes[-2]["id"]
            edges.append({"id": f"e{len(edges)+1}", "from": prev_id, "to": node_id, "condition": None})

    # Add summary at end
    summary_id = f"node_{len(nodes) + 1}"
    nodes.append({
        "id": summary_id,
        "type": "skill",
        "label": "生成汇总报告",
        "skill_id": "generate_summary",
        "config": {},
    })
    if nodes[-2]["type"] == "skill":
        edges.append({"id": f"e{len(edges)+1}", "from": nodes[-2]["id"], "to": summary_id, "condition": None})

    is_scheduled = any(kw in desc for kw in ["每天", "每周", "每月", "定时", "自动"])
    trigger = "scheduled" if is_scheduled else "manual"
    cron = "0 9 * * *" if "每天" in desc else ("0 9 * * 1" if "每周" in desc else None)

    name_parts = []
    for sid in matched_skills[:2]:
        name_parts.append(AVAILABLE_SKILLS.get(sid, {}).get("name", sid))
    name = " + ".join(name_parts) if name_parts else "自定义工作流"

    return {
        "status": "ok",
        "mode": "rule",
        "workflow": {
            "name": name,
            "description": description,
            "trigger_type": trigger,
            "cron_expr": cron,
            "nodes": nodes,
            "edges": edges,
        },
    }


def _assign_ids(wf: dict):
    """Ensure all nodes and edges have IDs."""
    for node in wf.get("nodes", []):
        if not node.get("id"):
            node["id"] = f"n_{uuid.uuid4().hex[:6]}"
    for edge in wf.get("edges", []):
        if not edge.get("id"):
            edge["id"] = f"e_{uuid.uuid4().hex[:6]}"
