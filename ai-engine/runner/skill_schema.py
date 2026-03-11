"""Skill 运行时数据结构定义"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class SkillStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    TRIAL = "trial"
    ACTIVE = "active"
    PAUSED = "paused"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    WAITING_INPUT = "waiting_input"


class ExecutionPhase(str, Enum):
    INTAKE = "intake"
    CONFIRM_PLAN = "confirm_plan"
    EXECUTING = "executing"
    CAPTURE = "capture"
    DONE = "done"


@dataclass
class IntakeQuestion:
    """收集阶段的单个问题"""
    question_id: str
    text: str
    options: list[str] = field(default_factory=list)
    allow_free_input: bool = True
    allow_multiple: bool = False
    required: bool = True


@dataclass
class ToolCall:
    tool_name: str
    description: str = ""
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class StepDefinition:
    step_id: str
    name: str
    description: str
    prompt_template: str
    tools: list[ToolCall] = field(default_factory=list)
    reference_files: list[str] = field(default_factory=list)
    output_format: str = "text"
    checkpoint: bool = False
    checkpoint_prompt: str = ""


@dataclass
class TwinDimensionMapping:
    """Skill 执行结果回写到数字孪生的哪个维度"""
    dimension: str  # product / customer / operation / team / financial
    extract_keys: list[str] = field(default_factory=list)


@dataclass
class SkillDefinition:
    skill_id: str
    name: str
    description: str
    trigger_phrases: list[str] = field(default_factory=list)
    system_prompt: str = ""
    intake: list[IntakeQuestion] = field(default_factory=list)
    steps: list[StepDefinition] = field(default_factory=list)
    output_template: str = ""
    capture_prompt: str = ""
    version: int = 1
    twin_dimensions: list[TwinDimensionMapping] = field(default_factory=list)

    @property
    def step_count(self) -> int:
        return len(self.steps)

    def get_step(self, step_id: str) -> StepDefinition | None:
        return next((s for s in self.steps if s.step_id == step_id), None)


@dataclass
class StepResult:
    step_id: str
    status: StepStatus
    output: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    error: str = ""


@dataclass
class SkillExecutionContext:
    """Skill 执行的运行时上下文——跨请求持久化"""
    execution_id: str
    skill: SkillDefinition
    user_input: str
    enterprise_id: str
    phase: ExecutionPhase = ExecutionPhase.INTAKE
    current_question_index: int = 0
    collected_answers: dict[str, str] = field(default_factory=dict)
    current_step_index: int = 0
    step_results: dict[str, StepResult] = field(default_factory=dict)
    enterprise_context: dict[str, Any] = field(default_factory=dict)
    auto_execute: bool = False
    task_id: str = ""

    @property
    def current_step(self) -> StepDefinition | None:
        if self.current_step_index < len(self.skill.steps):
            return self.skill.steps[self.current_step_index]
        return None

    @property
    def is_complete(self) -> bool:
        return self.phase == ExecutionPhase.DONE

    @property
    def current_question(self) -> IntakeQuestion | None:
        if self.current_question_index < len(self.skill.intake):
            return self.skill.intake[self.current_question_index]
        return None

    def get_collected_summary(self) -> str:
        if not self.collected_answers:
            return self.user_input
        parts = [f"用户原始需求：{self.user_input}"]
        for qid, answer in self.collected_answers.items():
            q = next((q for q in self.skill.intake if q.question_id == qid), None)
            label = q.text if q else qid
            parts.append(f"{label}：{answer}")
        return "\n".join(parts)

    def get_previous_results_summary(self) -> str:
        parts = []
        for step in self.skill.steps[:self.current_step_index]:
            result = self.step_results.get(step.step_id)
            if result and result.status == StepStatus.COMPLETED:
                parts.append(f"【{step.name}】\n{result.output[:800]}")
        return "\n\n".join(parts)
