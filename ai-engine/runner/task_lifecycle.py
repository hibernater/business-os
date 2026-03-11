"""
Task lifecycle management: create, update progress, and finalize tasks
via the Java backend internal API.
"""

from __future__ import annotations
import httpx
from config import JAVA_BACKEND_URL

_TIMEOUT = 5.0


async def create_task(
    enterprise_id: str,
    skill_id: str,
    skill_name: str,
    total_steps: int,
    trigger_type: str = "manual",
    user_id: str | None = None,
    schedule_id: str | None = None,
) -> str | None:
    """Create a task record; returns the task_id or None on failure."""
    body = {
        "enterpriseId": enterprise_id,
        "skillId": skill_id,
        "skillName": skill_name,
        "totalSteps": str(total_steps),
        "triggerType": trigger_type,
    }
    if user_id:
        body["userId"] = user_id
    if schedule_id:
        body["scheduleId"] = schedule_id

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(f"{JAVA_BACKEND_URL}/api/internal/tasks/create", json=body)
            data = resp.json()
            return data.get("taskId")
    except Exception:
        return None


async def update_task_progress(
    task_id: str,
    *,
    status: str | None = None,
    current_step: int | None = None,
    total_steps: int | None = None,
    error_message: str | None = None,
    output_summary: str | None = None,
    output_data: str | None = None,
) -> bool:
    if not task_id:
        return False

    body: dict = {}
    if status is not None:
        body["status"] = status
    if current_step is not None:
        body["currentStep"] = current_step
    if total_steps is not None:
        body["totalSteps"] = total_steps
    if error_message is not None:
        body["errorMessage"] = error_message
    if output_summary is not None:
        body["outputSummary"] = output_summary
    if output_data is not None:
        body["outputData"] = output_data

    if not body:
        return False

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(f"{JAVA_BACKEND_URL}/api/internal/tasks/{task_id}/progress", json=body)
            return resp.json().get("status") == "ok"
    except Exception:
        return False
