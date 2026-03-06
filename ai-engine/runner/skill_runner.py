"""
Skill 执行引擎：支持多轮交互的状态机

执行流程：
1. INTAKE 阶段：逐个发送 question 事件，等待用户回答
2. CONFIRM_PLAN 阶段：展示执行计划，等待用户确认
3. EXECUTING 阶段：逐步执行，checkpoint 处暂停等待反馈
4. CAPTURE 阶段：引导用户保存为专属 Skill

每次请求只推进到下一个等待点，然后发 waiting_input 信号结束流。
"""

from __future__ import annotations
import uuid
import asyncio
from typing import AsyncIterator

from llm.base import BaseLLM, ChatMessage
from runner.skill_schema import (
    SkillDefinition, SkillExecutionContext, StepResult, StepStatus,
    ExecutionPhase,
)
from runner.enterprise_context import fetch_enterprise_context
from tools.registry import execute_tool

# 内存中保存活跃的 Skill 执行上下文（单机版，后续可换 Redis）
_active_executions: dict[str, SkillExecutionContext] = {}


def get_active_execution(execution_id: str) -> SkillExecutionContext | None:
    return _active_executions.get(execution_id)


def get_execution_by_conversation(conversation_id: str) -> SkillExecutionContext | None:
    for ctx in _active_executions.values():
        if ctx.enterprise_context.get("conversation_id") == conversation_id:
            if not ctx.is_complete:
                return ctx
    return None


def clear_execution(execution_id: str):
    _active_executions.pop(execution_id, None)


class SkillRunner:
    def __init__(self, llm: BaseLLM):
        self.llm = llm

    async def start_execution(
        self,
        skill: SkillDefinition,
        user_input: str,
        conversation_id: str = "",
        enterprise_id: str = "",
    ) -> AsyncIterator[dict]:
        """启动新的 Skill 执行"""
        # 获取企业上下文（资产、偏好等）
        ent_context = {"conversation_id": conversation_id}
        try:
            loaded = await fetch_enterprise_context(enterprise_id, skill.skill_id)
            ent_context.update(loaded)
        except Exception:
            pass

        ctx = SkillExecutionContext(
            execution_id=str(uuid.uuid4()),
            skill=skill,
            user_input=user_input,
            enterprise_id=enterprise_id,
            enterprise_context=ent_context,
        )

        # 如果有保存的偏好，自动填入采集答案
        saved_prefs = ent_context.get("saved_preferences", {})
        if saved_prefs and skill.intake:
            for q in skill.intake:
                if q.question_id in saved_prefs:
                    ctx.collected_answers[q.question_id] = saved_prefs[q.question_id]

        _active_executions[ctx.execution_id] = ctx

        yield {
            "type": "skill_start",
            "skill_id": skill.skill_id,
            "name": skill.name,
            "execution_id": ctx.execution_id,
            "has_intake": len(skill.intake) > 0,
            "total_questions": len(skill.intake),
            "total_steps": skill.step_count,
        }

        # 检查是否所有采集问题已有保存的答案
        unanswered = [q for q in skill.intake if q.question_id not in ctx.collected_answers]
        if unanswered:
            ctx.current_question_index = next(
                i for i, q in enumerate(skill.intake)
                if q.question_id == unanswered[0].question_id
            )
            ctx.phase = ExecutionPhase.INTAKE
            if ctx.collected_answers:
                yield {
                    "type": "text_delta",
                    "content": "我记得你之前的一些偏好，已经帮你填好了，还有几个需要确认：\n\n",
                }
            async for event in self._send_next_question(ctx):
                yield event
        elif skill.intake:
            yield {
                "type": "text_delta",
                "content": "我记得你上次的所有偏好设置，直接用上次的配置执行。\n\n",
            }
            ctx.phase = ExecutionPhase.CONFIRM_PLAN
            async for event in self._send_plan_preview(ctx):
                yield event
        else:
            ctx.phase = ExecutionPhase.CONFIRM_PLAN
            async for event in self._send_plan_preview(ctx):
                yield event

    async def continue_execution(
        self,
        execution_id: str,
        user_reply: str,
    ) -> AsyncIterator[dict]:
        """用户回复后继续执行"""
        ctx = _active_executions.get(execution_id)
        if not ctx:
            yield {"type": "error", "message": "执行会话已过期，请重新开始"}
            return

        if ctx.phase == ExecutionPhase.INTAKE:
            async for event in self._handle_intake_reply(ctx, user_reply):
                yield event

        elif ctx.phase == ExecutionPhase.CONFIRM_PLAN:
            async for event in self._handle_plan_confirm(ctx, user_reply):
                yield event

        elif ctx.phase == ExecutionPhase.EXECUTING:
            async for event in self._handle_checkpoint_reply(ctx, user_reply):
                yield event

        elif ctx.phase == ExecutionPhase.CAPTURE:
            async for event in self._handle_capture_reply(ctx, user_reply):
                yield event

    # ========== INTAKE 阶段 ==========

    async def _send_next_question(self, ctx: SkillExecutionContext) -> AsyncIterator[dict]:
        q = ctx.current_question
        if not q:
            ctx.phase = ExecutionPhase.CONFIRM_PLAN
            async for event in self._send_plan_preview(ctx):
                yield event
            return

        yield {
            "type": "question",
            "execution_id": ctx.execution_id,
            "question_id": q.question_id,
            "text": q.text,
            "options": q.options,
            "allow_free_input": q.allow_free_input,
            "allow_multiple": q.allow_multiple,
            "question_index": ctx.current_question_index,
            "total_questions": len(ctx.skill.intake),
        }
        yield {
            "type": "waiting_input",
            "execution_id": ctx.execution_id,
            "phase": "intake",
        }

    async def _handle_intake_reply(self, ctx: SkillExecutionContext, reply: str) -> AsyncIterator[dict]:
        q = ctx.current_question
        if q:
            ctx.collected_answers[q.question_id] = reply

        ctx.current_question_index += 1

        if ctx.current_question_index < len(ctx.skill.intake):
            async for event in self._send_next_question(ctx):
                yield event
        else:
            ctx.phase = ExecutionPhase.CONFIRM_PLAN
            async for event in self._send_plan_preview(ctx):
                yield event

    # ========== CONFIRM PLAN 阶段 ==========

    async def _send_plan_preview(self, ctx: SkillExecutionContext) -> AsyncIterator[dict]:
        collected = ctx.get_collected_summary()
        steps_preview = [
            {"step_id": s.step_id, "name": s.name, "description": s.description}
            for s in ctx.skill.steps
        ]

        yield {
            "type": "plan_preview",
            "execution_id": ctx.execution_id,
            "collected_info": collected,
            "steps": steps_preview,
        }
        yield {
            "type": "waiting_input",
            "execution_id": ctx.execution_id,
            "phase": "confirm_plan",
            "prompt": "看看执行计划，确认开始还是要调整？",
        }

    async def _handle_plan_confirm(self, ctx: SkillExecutionContext, reply: str) -> AsyncIterator[dict]:
        decline_keywords = ["不", "取消", "算了", "换"]
        if any(k in reply for k in decline_keywords):
            yield {"type": "text_delta", "content": "好的，有需要再叫我。"}
            ctx.phase = ExecutionPhase.DONE
            clear_execution(ctx.execution_id)
            yield {"type": "skill_done", "skill_id": ctx.skill.skill_id, "execution_id": ctx.execution_id}
            return

        ctx.phase = ExecutionPhase.EXECUTING
        async for event in self._execute_next_step(ctx):
            yield event

    # ========== EXECUTING 阶段 ==========

    async def _execute_next_step(self, ctx: SkillExecutionContext) -> AsyncIterator[dict]:
        while ctx.current_step_index < len(ctx.skill.steps):
            step = ctx.current_step
            if step is None:
                break

            yield {
                "type": "step_start",
                "step_id": step.step_id,
                "step_name": step.name,
                "step_index": ctx.current_step_index,
                "total_steps": ctx.skill.step_count,
                "execution_id": ctx.execution_id,
            }

            # 执行步骤声明的 Tool，把结果注入 prompt
            tool_results = ""
            if step.tools:
                tool_parts = []
                for tc in step.tools:
                    params = dict(tc.params)
                    params.setdefault("enterprise_id", ctx.enterprise_id)
                    result = await execute_tool(tc.tool_name, params)
                    tool_parts.append(f"[{tc.tool_name}] {result}")
                    yield {
                        "type": "tool_call",
                        "tool_name": tc.tool_name,
                        "step_id": step.step_id,
                    }
                tool_results = "\n\nTool 调用结果：\n" + "\n".join(tool_parts)

            step_output = []
            try:
                prompt = self._render_prompt(step.prompt_template, ctx) + tool_results
                messages = [
                    ChatMessage(role="system", content=ctx.skill.system_prompt),
                    ChatMessage(role="user", content=prompt),
                ]

                async for chunk in self.llm.chat_stream(messages):
                    step_output.append(chunk)
                    yield {"type": "text_delta", "content": chunk}

                full_output = "".join(step_output)
                ctx.step_results[step.step_id] = StepResult(
                    step_id=step.step_id, status=StepStatus.COMPLETED, output=full_output,
                )
            except Exception as e:
                ctx.step_results[step.step_id] = StepResult(
                    step_id=step.step_id, status=StepStatus.FAILED, error=str(e),
                )
                yield {"type": "step_error", "step_id": step.step_id, "error": str(e)}
                break

            yield {"type": "step_done", "step_id": step.step_id}
            ctx.current_step_index += 1

            if step.checkpoint and ctx.current_step_index < len(ctx.skill.steps):
                yield {
                    "type": "checkpoint",
                    "execution_id": ctx.execution_id,
                    "step_id": step.step_id,
                    "prompt": step.checkpoint_prompt or "这一步完成了，继续还是要调整？",
                }
                yield {
                    "type": "waiting_input",
                    "execution_id": ctx.execution_id,
                    "phase": "executing",
                }
                return

        if ctx.current_step_index >= len(ctx.skill.steps):
            async for event in self._enter_capture_phase(ctx):
                yield event

    async def _handle_checkpoint_reply(self, ctx: SkillExecutionContext, reply: str) -> AsyncIterator[dict]:
        adjust_keywords = ["调整", "改", "不对", "重新", "换"]
        if any(k in reply for k in adjust_keywords):
            yield {
                "type": "text_delta",
                "content": f"好的，你说的「{reply}」我记下了，会在后面的分析中调整。\n\n",
            }
            prev_step_id = ctx.skill.steps[ctx.current_step_index - 1].step_id
            prev_result = ctx.step_results.get(prev_step_id)
            if prev_result:
                prev_result.output += f"\n\n[用户补充] {reply}"

        async for event in self._execute_next_step(ctx):
            yield event

    # ========== CAPTURE 阶段 ==========

    async def _enter_capture_phase(self, ctx: SkillExecutionContext) -> AsyncIterator[dict]:
        # 构建执行记录摘要
        execution_record = self._build_execution_record(ctx)

        yield {
            "type": "skill_done",
            "skill_id": ctx.skill.skill_id,
            "execution_id": ctx.execution_id,
            "execution_record": execution_record,
        }

        if ctx.skill.capture_prompt:
            ctx.phase = ExecutionPhase.CAPTURE
            yield {
                "type": "capture_offer",
                "execution_id": ctx.execution_id,
                "prompt": ctx.skill.capture_prompt,
                "collected_answers": ctx.collected_answers,
            }
            yield {
                "type": "waiting_input",
                "execution_id": ctx.execution_id,
                "phase": "capture",
            }
        else:
            ctx.phase = ExecutionPhase.DONE
            clear_execution(ctx.execution_id)

    async def _handle_capture_reply(self, ctx: SkillExecutionContext, reply: str) -> AsyncIterator[dict]:
        save_keywords = ["保存", "好", "要", "行", "可以", "yes"]
        if any(k in reply.lower() for k in save_keywords):
            yield {
                "type": "text_delta",
                "content": "好的！你的偏好已保存。下次触发这个 Skill 时，我会直接使用你的偏好设置，不用重新采集。\n",
            }
            yield {
                "type": "memory_save",
                "skill_id": ctx.skill.skill_id,
                "execution_id": ctx.execution_id,
                "memory_type": "preference",
                "data": {
                    "skill_id": ctx.skill.skill_id,
                    "skill_name": ctx.skill.name,
                    "preferences": ctx.collected_answers,
                },
            }
        else:
            yield {
                "type": "text_delta",
                "content": "没问题，下次需要再说。\n",
            }

        ctx.phase = ExecutionPhase.DONE
        clear_execution(ctx.execution_id)

    # ========== 工具方法 ==========

    def _render_prompt(self, template: str, ctx: SkillExecutionContext) -> str:
        collected_info = ctx.get_collected_summary()
        previous_results = ctx.get_previous_results_summary()
        enterprise_context = str(ctx.enterprise_context) if ctx.enterprise_context else "暂无"
        enterprise_assets = ctx.enterprise_context.get("assets_summary", "暂无企业资产数据")

        replacements = {
            "{collected_info}": collected_info,
            "{user_input}": ctx.user_input,
            "{previous_results}": previous_results,
            "{enterprise_context}": enterprise_context,
            "{enterprise_assets}": enterprise_assets,
        }
        result = template
        for placeholder, value in replacements.items():
            result = result.replace(placeholder, value)
        return result

    @staticmethod
    def _build_execution_record(ctx: SkillExecutionContext) -> dict:
        step_records = {}
        for step_id, result in ctx.step_results.items():
            step_records[step_id] = {
                "status": result.status.value,
                "output_length": len(result.output),
                "output_preview": result.output[:200],
                "error": result.error,
            }
        return {
            "execution_id": ctx.execution_id,
            "skill_id": ctx.skill.skill_id,
            "skill_name": ctx.skill.name,
            "user_input": ctx.user_input,
            "collected_answers": ctx.collected_answers,
            "step_count": ctx.skill.step_count,
            "completed_steps": sum(1 for r in ctx.step_results.values() if r.status == StepStatus.COMPLETED),
            "step_results": step_records,
            "full_output": ctx.get_previous_results_summary(),
        }


class MockSkillRunner(SkillRunner):
    """Mock 模式：不调用 LLM，生成模拟输出"""

    def __init__(self):
        self.llm = None  # type: ignore

    async def _execute_next_step(self, ctx: SkillExecutionContext) -> AsyncIterator[dict]:
        while ctx.current_step_index < len(ctx.skill.steps):
            step = ctx.current_step
            if step is None:
                break

            yield {
                "type": "step_start",
                "step_id": step.step_id,
                "step_name": step.name,
                "step_index": ctx.current_step_index,
                "total_steps": ctx.skill.step_count,
                "execution_id": ctx.execution_id,
            }

            mock_text = f"\n## {step.name}\n\n"
            mock_text += f"这是 **{step.name}** 的模拟输出（Mock模式）。\n\n"
            mock_text += f"在真实模式下，AI 会基于你提供的信息完成：\n> {step.description}\n\n"
            mock_text += f"你在采集阶段告诉我的信息：\n"
            for qid, ans in ctx.collected_answers.items():
                mock_text += f"- {qid}: {ans}\n"
            mock_text += "\n"

            for char in mock_text:
                yield {"type": "text_delta", "content": char}
                await asyncio.sleep(0.008)

            ctx.step_results[step.step_id] = StepResult(
                step_id=step.step_id, status=StepStatus.COMPLETED, output=mock_text,
            )
            yield {"type": "step_done", "step_id": step.step_id}
            ctx.current_step_index += 1

            if step.checkpoint and ctx.current_step_index < len(ctx.skill.steps):
                yield {
                    "type": "checkpoint",
                    "execution_id": ctx.execution_id,
                    "step_id": step.step_id,
                    "prompt": step.checkpoint_prompt or "继续还是调整？",
                }
                yield {
                    "type": "waiting_input",
                    "execution_id": ctx.execution_id,
                    "phase": "executing",
                }
                return

        if ctx.current_step_index >= len(ctx.skill.steps):
            async for event in self._enter_capture_phase(ctx):
                yield event
