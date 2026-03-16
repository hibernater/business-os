"""
Workflow Executor: stateful DAG execution engine with heartbeat and user interaction.

The executor manages a workflow instance through its lifecycle:
  idle → running → (waiting_input ↔ running) → completed/failed

At each heartbeat, it advances to the next node, evaluates conditions,
executes skills, and pauses when user input is needed.
"""

import json
import asyncio
import httpx
from datetime import datetime
from config import JAVA_BACKEND_URL


async def heartbeat_tick(execution: dict, workflow: dict, llm=None) -> dict:
    """
    Process one heartbeat tick for a workflow execution.

    Returns an event dict describing what happened:
    {
        "action": "execute_node" | "condition_check" | "request_input" | "complete" | "error",
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

    if node["type"] == "skill":
        result = await _execute_skill_node(node, context, execution, llm)
        completed_nodes.append(current_node_id)
        context[current_node_id] = {"result": result, "completedAt": datetime.now().isoformat()}

        next_id = _find_next(current_node_id, edges, completed_nodes, context)
        updates = {
            "completedNodesJson": json.dumps(completed_nodes),
            "contextJson": json.dumps(context, ensure_ascii=False),
            "lastHeartbeatAt": datetime.now().isoformat(),
        }
        if next_id:
            updates["currentNodeId"] = next_id
        else:
            updates["status"] = "completed"
            updates["completedAt"] = datetime.now().isoformat()

        return _event("execute_node", current_node_id, result, updates)

    elif node["type"] == "condition":
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
                "completedNodesJson": json.dumps(completed_nodes),
                "contextJson": json.dumps(context, ensure_ascii=False),
            })

        pending_interaction = json.dumps({
            "type": "condition_result",
            "node_id": current_node_id,
            "expression": condition_expr,
            "evaluation": evaluation,
            "options": [{"edge_id": e["id"], "label": e.get("condition", "继续"), "target": e["to"]} for e in outgoing],
            "message": f"条件检查完成：{condition_expr}\n结果：{evaluation}\n请选择下一步操作。",
        }, ensure_ascii=False)

        return _event("request_input", current_node_id, evaluation, {
            "status": "waiting_input",
            "pendingInteraction": pending_interaction,
            "completedNodesJson": json.dumps(completed_nodes),
            "contextJson": json.dumps(context, ensure_ascii=False),
        })

    return _event("error", current_node_id, f"未知节点类型: {node['type']}", {
        "status": "failed", "errorMessage": f"Unknown node type: {node['type']}"
    })


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
