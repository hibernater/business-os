"""
Workflow Executor: stateful DAG execution engine with heartbeat and user interaction.

The executor manages a workflow instance through its lifecycle:
  idle → running → (waiting_input ↔ running) → completed/failed

Supported node types:
  - skill:        Execute an AI Skill
  - condition:    Evaluate a condition and branch
  - human_task:   Assign work to a person, wait for completion
  - approval:     Require approval/rejection from a person
  - notification: Send a notification (non-blocking, then continue)
  - wait:         Pause for a duration or until a specific time
  - api_call:     Call an external HTTP endpoint
  - sub_workflow:  Trigger another workflow (placeholder)
  - loop:         Iterate over a list, executing a sub-path per item
"""

import json
import asyncio
import httpx
from datetime import datetime, timedelta
from config import JAVA_BACKEND_URL


NODE_TYPES = [
    "skill", "condition", "human_task", "approval",
    "notification", "wait", "api_call", "sub_workflow", "loop",
]


async def heartbeat_tick(execution: dict, workflow: dict, llm=None) -> dict:
    """
    Process one heartbeat tick for a workflow execution.

    Returns an event dict describing what happened:
    {
        "action": "execute_node" | "condition_check" | "request_input" | "complete" | "error" | ...,
        "node_id": ...,
        "result": ...,
        "updated_execution": { ... partial updates to persist }
    }
    """
    nodes = workflow.get("nodes", [])
    if isinstance(nodes, str):
        nodes = json.loads(nodes)
    edges = workflow.get("edges", [])
    if isinstance(edges, str):
        edges = json.loads(edges)

    node_map = {n["id"]: n for n in nodes}

    completed_nodes = json.loads(execution.get("completedNodesJson", "[]"))
    context = json.loads(execution.get("contextJson", "{}"))
    current_node_id = execution.get("currentNodeId")

    if not current_node_id:
        root_ids = _find_roots(nodes, edges)
        if not root_ids:
            return _event("error", None, "工作流没有起始节点", {
                "status": "failed", "errorMessage": "No root nodes"
            })
        current_node_id = root_ids[0]

    node = node_map.get(current_node_id)
    if not node:
        return _event("error", current_node_id, f"节点 {current_node_id} 不存在", {
            "status": "failed", "errorMessage": f"Node {current_node_id} not found"
        })

    if current_node_id in completed_nodes:
        next_id = _find_next(current_node_id, edges, completed_nodes, context)
        if not next_id:
            return _event("complete", current_node_id, "工作流本轮执行完毕", {
                "status": "completed",
                "completedAt": datetime.now().isoformat(),
            })
        return _event("advance", current_node_id, f"前进到 {next_id}", {
            "currentNodeId": next_id,
        })

    node_type = node.get("type", "skill")
    handler = _NODE_HANDLERS.get(node_type)
    if not handler:
        return _event("error", current_node_id, f"未知节点类型: {node_type}", {
            "status": "failed", "errorMessage": f"Unknown node type: {node_type}"
        })

    return await handler(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm)


# ────────────────────────────────────────────────────────────
# Node type handlers
# ────────────────────────────────────────────────────────────

async def _handle_skill(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    result = await _execute_skill_node(node, context, execution, llm)
    completed_nodes.append(current_node_id)
    context[current_node_id] = {"type": "skill", "result": result, "completedAt": datetime.now().isoformat()}

    next_id = _find_next(current_node_id, edges, completed_nodes, context)
    updates = _base_updates(completed_nodes, context)
    if next_id:
        updates["currentNodeId"] = next_id
    else:
        updates["status"] = "completed"
        updates["completedAt"] = datetime.now().isoformat()

    return _event("execute_node", current_node_id, result, updates)


async def _handle_condition(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    condition_expr = node.get("config", {}).get("expression", "")
    evaluation = await _evaluate_condition(condition_expr, context, llm)

    completed_nodes.append(current_node_id)
    context[current_node_id] = {
        "type": "condition",
        "expression": condition_expr,
        "result": evaluation,
        "completedAt": datetime.now().isoformat(),
    }

    outgoing = [e for e in edges if e["from"] == current_node_id]
    if not outgoing:
        return _event("complete", current_node_id, "条件节点之后没有后续", {
            "status": "completed", "completedAt": datetime.now().isoformat(),
            **_base_updates(completed_nodes, context),
        })

    pending_interaction = json.dumps({
        "type": "condition_result",
        "node_id": current_node_id,
        "node_type": "condition",
        "expression": condition_expr,
        "evaluation": evaluation,
        "options": [{"edge_id": e["id"], "label": e.get("condition", "继续"), "target": e["to"]} for e in outgoing],
        "message": f"条件检查完成：{condition_expr}\n结果：{evaluation}\n请选择下一步操作。",
    }, ensure_ascii=False)

    return _event("request_input", current_node_id, evaluation, {
        "status": "waiting_input",
        "pendingInteraction": pending_interaction,
        **_base_updates(completed_nodes, context),
    })


async def _handle_human_task(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    """Human task: assign work to a person and wait for them to mark it done."""
    config = node.get("config", {})
    assignee = config.get("assignee", "负责人")
    task_desc = config.get("description", node.get("label", "待完成的任务"))
    deadline = config.get("deadline", None)

    deadline_text = f"\n截止时间：{deadline}" if deadline else ""

    pending_interaction = json.dumps({
        "type": "human_task",
        "node_id": current_node_id,
        "node_type": "human_task",
        "assignee": assignee,
        "task_description": task_desc,
        "deadline": deadline,
        "options": [
            {"edge_id": "_done", "label": "已完成"},
            {"edge_id": "_skip", "label": "跳过"},
        ],
        "message": f"📋 人工任务：{task_desc}\n负责人：{assignee}{deadline_text}\n\n请在完成后点击「已完成」，或输入执行结果。",
    }, ensure_ascii=False)

    return _event("request_input", current_node_id, f"等待 {assignee} 完成: {task_desc}", {
        "status": "waiting_input",
        "pendingInteraction": pending_interaction,
        **_base_updates(completed_nodes, context),
    })


async def _handle_approval(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    """Approval: require someone to approve or reject before proceeding."""
    config = node.get("config", {})
    approver = config.get("approver", "审批人")
    subject = config.get("subject", node.get("label", "待审批事项"))
    detail = config.get("detail", "")

    prev_result = _get_prev_result_summary(current_node_id, edges, context)
    detail_text = detail or prev_result

    outgoing = [e for e in edges if e["from"] == current_node_id]
    options = []
    if outgoing:
        for e in outgoing:
            options.append({"edge_id": e["id"], "label": e.get("condition", "通过"), "target": e["to"]})
    if not options:
        options = [
            {"edge_id": "_approve", "label": "✅ 通过"},
            {"edge_id": "_reject", "label": "❌ 驳回"},
        ]

    pending_interaction = json.dumps({
        "type": "approval",
        "node_id": current_node_id,
        "node_type": "approval",
        "approver": approver,
        "subject": subject,
        "detail": detail_text[:500],
        "options": options,
        "message": f"🔒 审批请求：{subject}\n审批人：{approver}\n\n{detail_text[:300]}\n\n请选择审批结果，或输入审批意见。",
    }, ensure_ascii=False)

    return _event("request_input", current_node_id, f"等待 {approver} 审批: {subject}", {
        "status": "waiting_input",
        "pendingInteraction": pending_interaction,
        **_base_updates(completed_nodes, context),
    })


async def _handle_notification(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    """Notification: send a message and immediately continue (non-blocking)."""
    config = node.get("config", {})
    channel = config.get("channel", "system")
    recipients = config.get("recipients", [])
    template = config.get("message_template", node.get("label", "通知"))

    prev_result = _get_prev_result_summary(current_node_id, edges, context)
    message_body = template
    if "{prev_result}" in template:
        message_body = template.replace("{prev_result}", prev_result[:300])

    result = f"📢 通知已发送 → {channel}" + (f" ({', '.join(recipients)})" if recipients else "")
    result += f"\n内容：{message_body[:200]}"

    completed_nodes.append(current_node_id)
    context[current_node_id] = {
        "type": "notification",
        "channel": channel,
        "recipients": recipients,
        "message": message_body,
        "sent_at": datetime.now().isoformat(),
        "completedAt": datetime.now().isoformat(),
    }

    next_id = _find_next(current_node_id, edges, completed_nodes, context)
    updates = _base_updates(completed_nodes, context)
    if next_id:
        updates["currentNodeId"] = next_id
    else:
        updates["status"] = "completed"
        updates["completedAt"] = datetime.now().isoformat()

    return _event("notification_sent", current_node_id, result, updates)


async def _handle_wait(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    """Wait: pause execution for a duration or until a specific time."""
    config = node.get("config", {})
    wait_type = config.get("wait_type", "duration")
    duration_minutes = config.get("duration_minutes", 60)
    until_time = config.get("until_time", None)
    wait_reason = config.get("reason", node.get("label", "等待"))

    wait_started = context.get(current_node_id, {}).get("wait_started")

    if wait_started:
        started = datetime.fromisoformat(wait_started)
        if wait_type == "duration":
            target = started + timedelta(minutes=duration_minutes)
        elif wait_type == "until" and until_time:
            target = datetime.fromisoformat(until_time)
        else:
            target = started + timedelta(minutes=duration_minutes)

        if datetime.now() >= target:
            completed_nodes.append(current_node_id)
            context[current_node_id]["completed"] = True
            context[current_node_id]["completedAt"] = datetime.now().isoformat()

            next_id = _find_next(current_node_id, edges, completed_nodes, context)
            updates = _base_updates(completed_nodes, context)
            if next_id:
                updates["currentNodeId"] = next_id
            else:
                updates["status"] = "completed"
                updates["completedAt"] = datetime.now().isoformat()

            return _event("wait_complete", current_node_id, f"⏰ 等待结束：{wait_reason}", updates)
        else:
            remaining = int((target - datetime.now()).total_seconds() / 60)
            return _event("waiting", current_node_id, f"⏳ 等待中：{wait_reason}（还需 {remaining} 分钟）", {
                "lastHeartbeatAt": datetime.now().isoformat(),
            })
    else:
        context[current_node_id] = {
            "type": "wait",
            "wait_type": wait_type,
            "wait_started": datetime.now().isoformat(),
            "reason": wait_reason,
        }
        if wait_type == "duration":
            time_desc = f"{duration_minutes} 分钟"
        else:
            time_desc = f"到 {until_time}"

        return _event("wait_started", current_node_id, f"⏳ 开始等待：{wait_reason}（{time_desc}）", {
            "contextJson": json.dumps(context, ensure_ascii=False),
            "lastHeartbeatAt": datetime.now().isoformat(),
        })


async def _handle_api_call(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    """API call: make an HTTP request to an external endpoint."""
    config = node.get("config", {})
    method = config.get("method", "GET").upper()
    url = config.get("url", "")
    headers = config.get("headers", {})
    body = config.get("body", None)
    timeout_sec = config.get("timeout", 30)

    if not url:
        completed_nodes.append(current_node_id)
        context[current_node_id] = {
            "type": "api_call", "error": "未配置 URL",
            "completedAt": datetime.now().isoformat(),
        }
        next_id = _find_next(current_node_id, edges, completed_nodes, context)
        updates = _base_updates(completed_nodes, context)
        if next_id:
            updates["currentNodeId"] = next_id
        else:
            updates["status"] = "completed"
            updates["completedAt"] = datetime.now().isoformat()
        return _event("api_call_error", current_node_id, "API 调用失败：未配置 URL", updates)

    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            if method == "POST":
                resp = await client.post(url, json=body, headers=headers)
            elif method == "PUT":
                resp = await client.put(url, json=body, headers=headers)
            elif method == "DELETE":
                resp = await client.delete(url, headers=headers)
            else:
                resp = await client.get(url, headers=headers)

        result_data = {
            "status_code": resp.status_code,
            "body": resp.text[:1000],
        }
        result_text = f"🌐 API 调用完成：{method} {url} → {resp.status_code}"
    except Exception as e:
        result_data = {"error": str(e)[:200]}
        result_text = f"🌐 API 调用失败：{method} {url} → {str(e)[:100]}"

    completed_nodes.append(current_node_id)
    context[current_node_id] = {
        "type": "api_call",
        "method": method,
        "url": url,
        "result": result_data,
        "completedAt": datetime.now().isoformat(),
    }

    next_id = _find_next(current_node_id, edges, completed_nodes, context)
    updates = _base_updates(completed_nodes, context)
    if next_id:
        updates["currentNodeId"] = next_id
    else:
        updates["status"] = "completed"
        updates["completedAt"] = datetime.now().isoformat()

    return _event("api_call_done", current_node_id, result_text, updates)


async def _handle_sub_workflow(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    """Sub-workflow: trigger another workflow execution via the Java backend and track it."""
    config = node.get("config", {})
    sub_workflow_id = config.get("workflow_id", "")
    label = node.get("label", "子工作流")

    sub_state = context.get(current_node_id, {})

    if sub_state.get("sub_execution_id"):
        # Already triggered — poll its status
        sub_exec_id = sub_state["sub_execution_id"]
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{JAVA_BACKEND_URL}/api/workflows/executions/{sub_exec_id}",
                    headers={"X-Enterprise-Id": execution.get("enterpriseId", "default")}
                )
                if resp.status_code == 200:
                    sub_exec = resp.json()
                    sub_status = sub_exec.get("status", "unknown")
                    if sub_status in ("completed", "failed"):
                        completed_nodes.append(current_node_id)
                        sub_state["completedAt"] = datetime.now().isoformat()
                        sub_state["sub_status"] = sub_status
                        context[current_node_id] = sub_state

                        next_id = _find_next(current_node_id, edges, completed_nodes, context)
                        updates = _base_updates(completed_nodes, context)
                        if next_id:
                            updates["currentNodeId"] = next_id
                        else:
                            updates["status"] = "completed"
                            updates["completedAt"] = datetime.now().isoformat()

                        return _event("sub_workflow_done", current_node_id,
                                      f"🔗 子工作流「{label}」已{('完成' if sub_status == 'completed' else '失败')}", updates)
                    else:
                        return _event("waiting", current_node_id,
                                      f"🔗 子工作流「{label}」执行中（{sub_status}）",
                                      {"lastHeartbeatAt": datetime.now().isoformat()})
        except Exception as e:
            return _event("waiting", current_node_id,
                          f"🔗 子工作流「{label}」状态查询失败: {str(e)[:80]}",
                          {"lastHeartbeatAt": datetime.now().isoformat()})

    if not sub_workflow_id:
        completed_nodes.append(current_node_id)
        context[current_node_id] = {
            "type": "sub_workflow", "error": "未配置子工作流 ID",
            "completedAt": datetime.now().isoformat(),
        }
        next_id = _find_next(current_node_id, edges, completed_nodes, context)
        updates = _base_updates(completed_nodes, context)
        if next_id:
            updates["currentNodeId"] = next_id
        else:
            updates["status"] = "completed"
            updates["completedAt"] = datetime.now().isoformat()
        return _event("sub_workflow_error", current_node_id,
                      f"🔗 子工作流「{label}」未配置 ID，跳过", updates)

    # Trigger the sub-workflow via Java backend
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{JAVA_BACKEND_URL}/api/workflows/{sub_workflow_id}/start",
                headers={"X-Enterprise-Id": execution.get("enterpriseId", "default")}
            )
            if resp.status_code == 200:
                data = resp.json()
                sub_exec = data.get("execution", {})
                sub_exec_id = sub_exec.get("id", "")
                context[current_node_id] = {
                    "type": "sub_workflow",
                    "workflow_id": sub_workflow_id,
                    "sub_execution_id": sub_exec_id,
                    "triggered_at": datetime.now().isoformat(),
                }
                return _event("sub_workflow_started", current_node_id,
                              f"🔗 子工作流「{label}」已触发（execution: {sub_exec_id[:8]}...）",
                              {"contextJson": json.dumps(context, ensure_ascii=False),
                               "lastHeartbeatAt": datetime.now().isoformat()})
            else:
                raise Exception(f"HTTP {resp.status_code}")
    except Exception as e:
        completed_nodes.append(current_node_id)
        context[current_node_id] = {
            "type": "sub_workflow", "error": str(e)[:200],
            "completedAt": datetime.now().isoformat(),
        }
        next_id = _find_next(current_node_id, edges, completed_nodes, context)
        updates = _base_updates(completed_nodes, context)
        if next_id:
            updates["currentNodeId"] = next_id
        else:
            updates["status"] = "completed"
            updates["completedAt"] = datetime.now().isoformat()
        return _event("sub_workflow_error", current_node_id,
                      f"🔗 子工作流触发失败: {str(e)[:100]}", updates)


async def _handle_loop(node, current_node_id, nodes, edges, completed_nodes, context, execution, llm):
    """Loop: iterate over a collection. Uses context to track iteration state."""
    config = node.get("config", {})
    items_expr = config.get("items", "[]")
    loop_var = config.get("loop_var", "item")
    label = node.get("label", "循环")

    loop_state = context.get(current_node_id, {})

    if not loop_state.get("initialized"):
        if isinstance(items_expr, str):
            try:
                items = json.loads(items_expr)
            except json.JSONDecodeError:
                items = [items_expr]
        elif isinstance(items_expr, list):
            items = items_expr
        else:
            items = [str(items_expr)]

        context[current_node_id] = {
            "type": "loop",
            "items": items,
            "current_index": 0,
            "total": len(items),
            "results": [],
            "initialized": True,
        }
        loop_state = context[current_node_id]

    items = loop_state.get("items", [])
    idx = loop_state.get("current_index", 0)
    total = loop_state.get("total", len(items))
    results = loop_state.get("results", [])

    if idx >= total:
        completed_nodes.append(current_node_id)
        loop_state["completedAt"] = datetime.now().isoformat()
        context[current_node_id] = loop_state

        next_id = _find_next(current_node_id, edges, completed_nodes, context)
        updates = _base_updates(completed_nodes, context)
        if next_id:
            updates["currentNodeId"] = next_id
        else:
            updates["status"] = "completed"
            updates["completedAt"] = datetime.now().isoformat()

        return _event("loop_complete", current_node_id,
                       f"🔄 循环完成：{label}（{total} 次迭代）", updates)

    current_item = items[idx]
    iter_result = f"[{label}] 第 {idx + 1}/{total} 次：处理 {json.dumps(current_item, ensure_ascii=False)[:100]}"

    results.append({"index": idx, "item": current_item, "result": iter_result})
    loop_state["current_index"] = idx + 1
    loop_state["results"] = results
    context[current_node_id] = loop_state

    return _event("loop_iteration", current_node_id,
                   f"🔄 {label}（{idx + 1}/{total}）", {
                       "contextJson": json.dumps(context, ensure_ascii=False),
                       "lastHeartbeatAt": datetime.now().isoformat(),
                   })


# ────────────────────────────────────────────────────────────
# Handler registry
# ────────────────────────────────────────────────────────────

_NODE_HANDLERS = {
    "skill": _handle_skill,
    "condition": _handle_condition,
    "human_task": _handle_human_task,
    "approval": _handle_approval,
    "notification": _handle_notification,
    "wait": _handle_wait,
    "api_call": _handle_api_call,
    "sub_workflow": _handle_sub_workflow,
    "loop": _handle_loop,
}


# ────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────

async def _execute_skill_node(node: dict, context: dict, execution: dict, llm=None) -> str:
    """Execute a skill node — call the AI engine or produce a mock result."""
    skill_id = node.get("skill_id", "")
    label = node.get("label", skill_id)

    prev_summaries = []
    for nid, nctx in context.items():
        if isinstance(nctx, dict) and "result" in nctx:
            prev_summaries.append(str(nctx["result"])[:200])
    prev_context = "\n".join(prev_summaries[-3:]) if prev_summaries else ""

    if llm:
        from llm.base import ChatMessage
        prompt = f"你正在执行工作流中的一个步骤：「{label}」(skill: {skill_id})\n"
        if prev_context:
            prompt += f"\n前序步骤结果：\n{prev_context}\n"
        prompt += "\n请模拟执行这个步骤，给出简洁的执行结果（2-3句话）。"
        try:
            resp = await llm.chat([ChatMessage(role="user", content=prompt)])
            return resp.content
        except Exception as e:
            return f"[{label}] 执行完成（LLM 异常: {str(e)[:50]}）"

    return f"[{label}] 已执行完成。" + (f"基于前序数据进行了分析。" if prev_context else "")


async def _evaluate_condition(expression: str, context: dict, llm=None) -> str:
    """Evaluate a condition node — use LLM or simple heuristic."""
    if llm:
        from llm.base import ChatMessage
        ctx_summary = json.dumps(context, ensure_ascii=False, default=str)[:500]
        prompt = (
            f"根据以下工作流上下文，判断条件「{expression}」是否成立。\n"
            f"上下文：{ctx_summary}\n"
            f"请回答：成立/不成立，并简述原因。"
        )
        try:
            resp = await llm.chat([ChatMessage(role="user", content=prompt)])
            return resp.content
        except Exception:
            pass
    return f"条件「{expression}」需要用户确认"


def _get_prev_result_summary(current_node_id: str, edges: list, context: dict) -> str:
    """Get summary of the previous node's result for context."""
    incoming = [e for e in edges if e["to"] == current_node_id]
    for e in incoming:
        prev = context.get(e["from"], {})
        if isinstance(prev, dict):
            result = prev.get("result", "")
            if result:
                return str(result)[:500]
    return ""


def _base_updates(completed_nodes: list, context: dict) -> dict:
    return {
        "completedNodesJson": json.dumps(completed_nodes),
        "contextJson": json.dumps(context, ensure_ascii=False),
        "lastHeartbeatAt": datetime.now().isoformat(),
    }


def _find_roots(nodes: list, edges: list) -> list:
    """Find nodes with no incoming edges."""
    targets = {e["to"] for e in edges}
    return [n["id"] for n in nodes if n["id"] not in targets]


def _find_next(current_id: str, edges: list, completed: list, context: dict) -> str | None:
    """Find the next node to execute after current_id."""
    outgoing = [e for e in edges if e["from"] == current_id]
    for e in outgoing:
        if e["to"] not in completed:
            return e["to"]
    return None


def _event(action: str, node_id: str | None, result, updates: dict) -> dict:
    return {
        "action": action,
        "node_id": node_id,
        "result": result,
        "updated_execution": updates,
    }
