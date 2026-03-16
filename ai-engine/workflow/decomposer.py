"""
Workflow Decomposer: natural language → structured workflow definition.

Takes a user's description of a business process and decomposes it into
a DAG of Skill nodes with edges and optional conditions.
"""

import json
import uuid
from dataclasses import dataclass, field

AVAILABLE_SKILLS = {
    # 商品维度
    "pricing_strategy": {"name": "智能定价策略", "desc": "分析竞品和成本，给出定价方案", "dim": "product"},
    "new_product_plan": {"name": "新品开发方案", "desc": "基于参考款完成市场调研和新品规划", "dim": "product"},
    "product_selection": {"name": "爆款选品分析", "desc": "分析市场趋势，筛选高潜力商品方向", "dim": "product"},
    "competitor_monitor": {"name": "竞品监控分析", "desc": "追踪竞品价格、新品和营销动态", "dim": "product"},
    "inventory_check": {"name": "库存健康检查", "desc": "盘点库存状态，预警缺货和滞销", "dim": "product"},
    # 客户维度
    "customer_segmentation": {"name": "客户分群运营", "desc": "基于RFM模型做客户分群和运营策略", "dim": "customer"},
    "customer_lifecycle": {"name": "客户生命周期管理", "desc": "追踪客户从新客到流失的全周期运营", "dim": "customer"},
    "review_analysis": {"name": "评价口碑分析", "desc": "分析评价挖掘卖点和痛点", "dim": "customer"},
    # 运营维度
    "inquiry_daily": {"name": "每日经营看板", "desc": "汇总今日经营数据生成日报", "dim": "operation"},
    "refund_analysis": {"name": "退款退货分析", "desc": "分析退款原因和问题商品", "dim": "operation"},
    "conversion_optimization": {"name": "转化率诊断优化", "desc": "全链路转化漏斗分析和优化", "dim": "operation"},
    "promotion_planner": {"name": "营销活动策划", "desc": "设计促销方案、预算分配和ROI测算", "dim": "operation"},
    "listing_optimization": {"name": "商品详情页优化", "desc": "诊断标题主图详情页并给出优化方案", "dim": "operation"},
    # 团队维度
    "team_performance": {"name": "团队绩效看板", "desc": "分析团队产出和效率，生成绩效报告", "dim": "team"},
    "customer_service_qa": {"name": "客服质检分析", "desc": "评估客服服务质量和效率", "dim": "team"},
    # 财务维度
    "profit_analysis": {"name": "利润分析报表", "desc": "拆解营收成本，计算真实利润率", "dim": "financial"},
    "cost_optimization": {"name": "成本结构优化", "desc": "找出不合理支出，降低运营成本", "dim": "financial"},
    "cash_flow_forecast": {"name": "现金流预测", "desc": "预测未来资金状况，预警资金风险", "dim": "financial"},
    # 基础能力
    "fetch_platform_data": {"name": "平台数据同步", "desc": "从电商平台拉取最新经营数据", "dim": "operation"},
    "generate_summary": {"name": "智能汇总报告", "desc": "汇总分析结果生成格式化报告", "dim": "operation"},
}

DECOMPOSE_PROMPT = """你是一个企业工作流设计专家。用户会用自然语言描述一个业务流程，你需要把它拆解成一个工作流。

可用的原子 Skill（只能用这些，不能编造）:
{skills_list}

可用的节点类型：
- skill: 执行一个 AI Skill（必须关联 skill_id）
- condition: 条件判断/分支（config 中填 expression）
- human_task: 分配给人工完成的任务（config 中填 assignee, description, deadline）
- approval: 审批节点，需要某人批准才能继续（config 中填 approver, subject）
- notification: 发送通知（config 中填 channel, message_template, recipients）
- wait: 等待一段时间（config 中填 wait_type=duration/until, duration_minutes 或 until_time, reason）
- api_call: 调用外部 API（config 中填 method, url, headers, body）
- loop: 循环处理（config 中填 items, loop_var）

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
      "type": "approval",
      "label": "老板审批",
      "skill_id": null,
      "config": {{"approver": "老板", "subject": "需要审批的事项"}}
    }},
    {{
      "id": "node_3",
      "type": "notification",
      "label": "通知团队",
      "skill_id": null,
      "config": {{"channel": "企微", "message_template": "工作流已完成", "recipients": ["运营组"]}}
    }}
  ],
  "edges": [
    {{"id": "e1", "from": "node_1", "to": "node_2", "condition": null}},
    {{"id": "e2", "from": "node_2", "to": "node_3", "condition": "通过"}}
  ]
}}

规则：
1. 每个 skill 节点必须对应 AVAILABLE_SKILLS 中的一个 skill_id
2. 如果用户描述中有条件判断（如"如果...就..."），用 type="condition" 节点
3. 如果用户描述中有人工操作（如"让某人做..."），用 type="human_task" 节点
4. 如果用户描述中有审批（如"需要审批/批准"），用 type="approval" 节点
5. 如果用户描述中有通知（如"通知/告知/推送"），用 type="notification" 节点
6. 如果用户描述中有等待（如"等到/过一段时间"），用 type="wait" 节点
7. 如果有明确的外部 API 调用需求，用 type="api_call" 节点
8. 节点按执行顺序排列
9. 如果找不到完全匹配的 Skill，用最接近的
10. 只输出 JSON，不要其他文字

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
        # 商品
        (["定价", "价格调整", "定价策略"], "pricing_strategy"),
        (["新品开发", "新品方案", "新款"], "new_product_plan"),
        (["选品", "爆款", "蓝海", "什么品好卖"], "product_selection"),
        (["竞品", "竞争", "对手", "竞品监控"], "competitor_monitor"),
        (["库存", "缺货", "补货", "滞销"], "inventory_check"),
        # 客户
        (["客户分群", "rfm", "分群运营"], "customer_segmentation"),
        (["客户生命周期", "留存", "流失", "复购", "老客户"], "customer_lifecycle"),
        (["评价", "口碑", "差评", "好评", "评论"], "review_analysis"),
        # 运营
        (["日报", "每天", "经营数据", "昨天", "昨日", "看板"], "inquiry_daily"),
        (["退款", "退货", "售后"], "refund_analysis"),
        (["转化率", "转化", "漏斗", "为什么不下单"], "conversion_optimization"),
        (["促销", "活动", "大促", "双11", "618", "营销"], "promotion_planner"),
        (["详情页", "标题", "主图", "listing"], "listing_optimization"),
        # 团队
        (["团队", "绩效", "员工", "人效", "考核"], "team_performance"),
        (["客服", "质检", "服务质量", "响应"], "customer_service_qa"),
        # 财务
        (["利润", "盈亏", "毛利", "净利", "赚钱"], "profit_analysis"),
        (["成本", "省钱", "费用", "开支"], "cost_optimization"),
        (["现金流", "资金", "周转", "备货资金"], "cash_flow_forecast"),
        # 基础
        (["数据", "拉取", "同步", "导入"], "fetch_platform_data"),
    ]

    matched_skills = []
    for keywords, skill_id in keyword_skills:
        if any(kw in desc for kw in keywords):
            matched_skills.append(skill_id)

    if not matched_skills:
        matched_skills = ["inquiry_daily"]

    has_condition = any(kw in desc for kw in ["如果", "当", "超过", "低于", "大于", "小于"])
    has_approval = any(kw in desc for kw in ["审批", "批准", "审核", "老板确认"])
    has_notify = any(kw in desc for kw in ["通知", "推送", "告知", "发给", "发送", "企微", "钉钉", "微信"])
    has_wait = any(kw in desc for kw in ["等到", "等待", "隔一段时间", "小时后", "分钟后"])
    has_human = any(kw in desc for kw in ["让人", "手动", "人工", "安排人", "分配给"])

    eid = 0

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
            edges.append({"id": f"e{(eid := eid + 1)}", "from": node_id, "to": cond_id, "condition": None})
            edges.append({"id": f"e{(eid := eid + 1)}", "from": cond_id, "to": f"node_{i + 2}", "condition": "异常时"})
        elif i > 0:
            prev_id = nodes[-2]["id"]
            edges.append({"id": f"e{(eid := eid + 1)}", "from": prev_id, "to": node_id, "condition": None})

    last_node_id = nodes[-1]["id"]

    if has_approval:
        approval_id = f"approval_{len(nodes) + 1}"
        nodes.append({
            "id": approval_id, "type": "approval", "label": "审批确认",
            "skill_id": None,
            "config": {"approver": "负责人", "subject": "工作流执行结果需要审批"},
        })
        edges.append({"id": f"e{(eid := eid + 1)}", "from": last_node_id, "to": approval_id, "condition": None})
        last_node_id = approval_id

    if has_human:
        human_id = f"human_{len(nodes) + 1}"
        nodes.append({
            "id": human_id, "type": "human_task", "label": "人工处理",
            "skill_id": None,
            "config": {"assignee": "负责人", "description": "请根据分析结果执行后续操作"},
        })
        edges.append({"id": f"e{(eid := eid + 1)}", "from": last_node_id, "to": human_id, "condition": None})
        last_node_id = human_id

    if has_wait:
        wait_id = f"wait_{len(nodes) + 1}"
        nodes.append({
            "id": wait_id, "type": "wait", "label": "等待执行窗口",
            "skill_id": None,
            "config": {"wait_type": "duration", "duration_minutes": 60, "reason": "等待合适的执行时机"},
        })
        edges.append({"id": f"e{(eid := eid + 1)}", "from": last_node_id, "to": wait_id, "condition": None})
        last_node_id = wait_id

    summary_id = f"node_{len(nodes) + 1}"
    nodes.append({
        "id": summary_id,
        "type": "skill",
        "label": "智能汇总报告",
        "skill_id": "generate_summary",
        "config": {},
    })
    edges.append({"id": f"e{(eid := eid + 1)}", "from": last_node_id, "to": summary_id, "condition": None})
    last_node_id = summary_id

    if has_notify:
        notify_id = f"notify_{len(nodes) + 1}"
        nodes.append({
            "id": notify_id, "type": "notification", "label": "发送通知",
            "skill_id": None,
            "config": {
                "channel": "企微" if "企微" in desc else ("钉钉" if "钉钉" in desc else "system"),
                "message_template": "工作流执行完毕：{prev_result}",
                "recipients": [],
            },
        })
        edges.append({"id": f"e{(eid := eid + 1)}", "from": last_node_id, "to": notify_id, "condition": None})

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
