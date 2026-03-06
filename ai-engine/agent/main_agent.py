"""主 Agent：意图路由 + Skill 交互式执行 + Skill 创建 + 普通对话"""

from __future__ import annotations
from typing import AsyncIterator

from llm.base import BaseLLM, ChatMessage
from agent.intent_router import route_intent, Intent
from agent.skill_creator import SkillCreator, get_creation_by_conversation
from runner.skill_loader import load_all_preset_skills
from runner.skill_runner import SkillRunner, get_execution_by_conversation

SYSTEM_PROMPT = (
    "你是商家OS的AI助手，帮助中小企业老板管理日常经营工作流。\n"
    "你可以帮助用户创建和执行工作流(Skill)，分析经营数据，回答经营问题。\n\n"
    "你已经安装了以下 Skill：\n{skill_list}\n\n"
    "当用户的意图匹配某个 Skill 时，会进入引导式对话，先了解需求再执行。\n"
    "当用户描述一个新的工作流程时，你会引导用户把它变成一个可自动执行的 Skill。\n"
    "普通对话时，你就是一个懂经营的AI顾问，有什么问题都可以聊。"
)


class MainAgent:
    def __init__(self, llm: BaseLLM):
        self.llm = llm
        self.skills = load_all_preset_skills()
        self.skill_runner = SkillRunner(llm)
        self.skill_creator = SkillCreator(llm)
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        if not self.skills:
            skill_list = "（暂无已安装的 Skill）"
        else:
            lines = [f"  - 📦 {s.name}: {s.description[:80]}" for s in self.skills.values()]
            skill_list = "\n".join(lines)
        return SYSTEM_PROMPT.format(skill_list=skill_list)

    async def chat_stream(
        self,
        user_message: str,
        conversation_id: str = "",
        history: list[ChatMessage] | None = None,
    ) -> AsyncIterator[dict]:
        """
        统一入口：
        1. 检查是否有进行中的 Skill 执行
        2. 检查是否有进行中的 Skill 创建
        3. 做意图路由
        """
        # 续接 Skill 执行
        active_exec = get_execution_by_conversation(conversation_id)
        if active_exec:
            async for event in self.skill_runner.continue_execution(
                active_exec.execution_id, user_message
            ):
                yield event
            return

        # 续接 Skill 创建
        active_creation = get_creation_by_conversation(conversation_id)
        if active_creation:
            async for event in self.skill_creator.continue_creation(
                active_creation["creation_id"], user_message
            ):
                yield event
            return

        # 意图路由
        intent_result = await route_intent(
            self.llm, user_message, self.skills, history
        )

        yield {
            "type": "intent",
            "intent": intent_result.intent.value,
            "skill_id": intent_result.skill_id,
            "skill_name": intent_result.skill_name,
            "confidence": intent_result.confidence,
            "reasoning": intent_result.reasoning,
        }

        if intent_result.intent == Intent.EXECUTE_SKILL and intent_result.skill_id:
            skill = self.skills[intent_result.skill_id]
            async for event in self.skill_runner.start_execution(
                skill=skill,
                user_input=user_message,
                conversation_id=conversation_id,
            ):
                yield event

        elif intent_result.intent == Intent.CREATE_SKILL:
            async for event in self.skill_creator.start_creation(
                user_message=user_message,
                conversation_id=conversation_id,
            ):
                yield event

        else:
            async for chunk in self._plain_chat_stream(user_message, history):
                yield {"type": "text_delta", "content": chunk}

    async def _plain_chat_stream(
        self, user_message: str, history: list[ChatMessage] | None = None
    ) -> AsyncIterator[str]:
        messages = self._build_messages(user_message, history)
        async for chunk in self.llm.chat_stream(messages):
            yield chunk

    def _build_messages(
        self, user_message: str, history: list[ChatMessage] | None
    ) -> list[ChatMessage]:
        messages = [ChatMessage(role="system", content=self.system_prompt)]
        if history:
            messages.extend(history)
        messages.append(ChatMessage(role="user", content=user_message))
        return messages
