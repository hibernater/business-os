"""
Skill 定时调度引擎

支持 cron 表达式和固定间隔两种调度方式。
定时执行的 Skill 走「自动模式」：跳过 intake（用保存的偏好）、跳过确认、直接执行。
执行结果保存到历史记录并推送通知。
"""

from __future__ import annotations
import uuid
import json
import asyncio
import logging
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from config import JAVA_BACKEND_URL

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
_schedule_registry: dict[str, "ScheduleConfig"] = {}


@dataclass
class ScheduleConfig:
    schedule_id: str
    skill_id: str
    enterprise_id: str
    cron_expr: str = ""
    interval_minutes: int = 0
    enabled: bool = True
    last_run_at: str = ""
    last_status: str = ""
    created_at: str = ""

    def to_dict(self) -> dict:
        return {
            "scheduleId": self.schedule_id,
            "skillId": self.skill_id,
            "enterpriseId": self.enterprise_id,
            "cronExpr": self.cron_expr,
            "intervalMinutes": self.interval_minutes,
            "enabled": self.enabled,
            "lastRunAt": self.last_run_at,
            "lastStatus": self.last_status,
            "createdAt": self.created_at,
        }


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
        _scheduler.start()
        logger.info("Scheduler started")
    return _scheduler


async def _execute_scheduled_skill(schedule_id: str):
    """自动模式执行 Skill：读取保存的偏好，跳过交互，直接执行全部步骤"""
    config = _schedule_registry.get(schedule_id)
    if not config or not config.enabled:
        return

    logger.info(f"Scheduled execution: skill={config.skill_id} enterprise={config.enterprise_id}")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{JAVA_BACKEND_URL}/api/internal/scheduled-run",
                json={
                    "skillId": config.skill_id,
                    "enterpriseId": config.enterprise_id,
                    "scheduleId": schedule_id,
                },
            )
            if resp.status_code == 200:
                config.last_status = "success"
            else:
                config.last_status = f"error:{resp.status_code}"
                logger.warning(f"Scheduled run failed: {resp.status_code} {resp.text[:200]}")

    except Exception as e:
        config.last_status = f"error:{str(e)[:100]}"
        logger.error(f"Scheduled execution failed: {e}")

    config.last_run_at = datetime.now().isoformat()


def create_schedule(
    skill_id: str,
    enterprise_id: str,
    cron_expr: str = "",
    interval_minutes: int = 0,
) -> ScheduleConfig:
    schedule_id = str(uuid.uuid4())[:8]
    config = ScheduleConfig(
        schedule_id=schedule_id,
        skill_id=skill_id,
        enterprise_id=enterprise_id,
        cron_expr=cron_expr,
        interval_minutes=interval_minutes,
        created_at=datetime.now().isoformat(),
    )

    scheduler = get_scheduler()

    if cron_expr:
        trigger = CronTrigger.from_crontab(cron_expr)
    elif interval_minutes > 0:
        trigger = IntervalTrigger(minutes=interval_minutes)
    else:
        raise ValueError("Must provide cron_expr or interval_minutes")

    scheduler.add_job(
        _execute_scheduled_skill,
        trigger=trigger,
        args=[schedule_id],
        id=schedule_id,
        replace_existing=True,
    )

    _schedule_registry[schedule_id] = config
    logger.info(f"Created schedule {schedule_id} for skill {skill_id}")
    return config


def delete_schedule(schedule_id: str) -> bool:
    scheduler = get_scheduler()
    config = _schedule_registry.pop(schedule_id, None)
    if config:
        try:
            scheduler.remove_job(schedule_id)
        except Exception:
            pass
        return True
    return False


def toggle_schedule(schedule_id: str, enabled: bool) -> ScheduleConfig | None:
    config = _schedule_registry.get(schedule_id)
    if not config:
        return None
    config.enabled = enabled
    scheduler = get_scheduler()
    if enabled:
        try:
            scheduler.resume_job(schedule_id)
        except Exception:
            pass
    else:
        try:
            scheduler.pause_job(schedule_id)
        except Exception:
            pass
    return config


def list_schedules(enterprise_id: str = "") -> list[ScheduleConfig]:
    if enterprise_id:
        return [c for c in _schedule_registry.values() if c.enterprise_id == enterprise_id]
    return list(_schedule_registry.values())


def get_schedule(schedule_id: str) -> ScheduleConfig | None:
    return _schedule_registry.get(schedule_id)
