"""
对话式 Skill 创建器：引导用户描述工作流，生成 Skill YAML

流程：
1. 用户描述一个工作流程
2. AI 追问关键细节（几个问题）
3. AI 生成 Skill 定义
4. 用户确认/调整
5. 保存 Skill
"""

from __future__ import annotations
import uuid
import asyncio
from typing import AsyncIterator

from llm.base import BaseLLM, ChatMessage

# 内存中保存进行中的 Skill 创建会话
_active_creations: dict[str, dict] = {}


def get_creation_by_conversation(conversation_id: str) -> dict | None:
    for ctx in _active_creations.values():
        if ctx.get("conversation_id") == conversation_id and ctx.get("phase") != "done":
            return ctx
    return None


COLLECT_SYSTEM_PROMPT = """你是一个工作流设计专家。用户正在描述他的业务工作流程，你需要帮他把这个流程变成一个可自动执行的 Skill。

你的任务是通过对话，逐步了解清楚这个工作流：
1. 这个工作流是做什么的（目标）
2. 具体的步骤（每一步做什么）
3. 每一步需要什么输入信息
4. 执行频率（每天/每周/按需触发）
5. 用什么词/句子来触发这个流程

请一次只问一个问题，简洁友好。不要一次问太多。
当你觉得信息已经够了（通常3-5轮对话），输出 [READY] 标记，然后输出你对这个 Skill 的理解总结。"""

GENERATE_SYSTEM_PROMPT = """你是一个 Skill YAML 配置生成专家。根据对话中收集到的信息，生成一个完整的 skill.yaml 配置。

YAML 格式要求：
```yaml
skill_id: xxx_yyy  # 英文下划线
name: 中文名称
description: >
  一句话描述
version: 1
trigger_phrases:
  - 触发词1
  - 触发词2
system_prompt: >
  角色定义和要求
intake:
  - question_id: xxx
    text: "要问用户的问题"
    options: ["选项1", "选项2"]
    allow_free_input: true
steps:
  - step_id: xxx
    name: 步骤名
    description: 做什么
    checkpoint: true/false
    checkpoint_prompt: "确认提示"
    prompt_template: |
      详细的 prompt...
capture_prompt: >
  保存偏好的引导语
```

只输出 YAML 内容，不要其他解释文字。"""


class SkillCreator:
    def __init__(self, llm: BaseLLM):
        self.llm = llm

    async def start_creation(
        self,
        user_message: str,
        conversation_id: str = "",
    ) -> AsyncIterator[dict]:
        """启动 Skill 创建对话"""
        creation_id = str(uuid.uuid4())
        ctx = {
            "creation_id": creation_id,
            "conversation_id": conversation_id,
            "phase": "collecting",
            "history": [
                {"role": "user", "content": user_message},
            ],
            "workflow_description": user_message,
        }
        _active_creations[creation_id] = ctx

        yield {
            "type": "skill_creation_start",
            "creation_id": creation_id,
        }

        messages = [
            ChatMessage(role="system", content=COLLECT_SYSTEM_PROMPT),
            ChatMessage(role="user", content=user_message),
        ]

        response_parts = []
        async for chunk in self.llm.chat_stream(messages):
            response_parts.append(chunk)
            yield {"type": "text_delta", "content": chunk}

        full_response = "".join(response_parts)
        ctx["history"].append({"role": "assistant", "content": full_response})

        if "[READY]" in full_response:
            ctx["phase"] = "confirming"
            yield {
                "type": "skill_creation_confirm",
                "creation_id": creation_id,
                "prompt": "我理解的对吗？确认后我帮你生成 Skill。",
            }
        yield {
            "type": "waiting_input",
            "execution_id": creation_id,
            "phase": "skill_creation",
        }

    async def continue_creation(
        self,
        creation_id: str,
        user_reply: str,
    ) -> AsyncIterator[dict]:
        """继续 Skill 创建对话"""
        ctx = _active_creations.get(creation_id)
        if not ctx:
            yield {"type": "error", "message": "创建会话已过期"}
            return

        ctx["history"].append({"role": "user", "content": user_reply})

        if ctx["phase"] == "confirming":
            confirm_keywords = ["对", "没问题", "确认", "好", "可以", "生成", "是"]
            if any(k in user_reply for k in confirm_keywords):
                async for event in self._generate_skill(ctx):
                    yield event
                return

        messages = [ChatMessage(role="system", content=COLLECT_SYSTEM_PROMPT)]
        for h in ctx["history"]:
            messages.append(ChatMessage(role=h["role"], content=h["content"]))

        response_parts = []
        async for chunk in self.llm.chat_stream(messages):
            response_parts.append(chunk)
            yield {"type": "text_delta", "content": chunk}

        full_response = "".join(response_parts)
        ctx["history"].append({"role": "assistant", "content": full_response})

        if "[READY]" in full_response:
            ctx["phase"] = "confirming"
            yield {
                "type": "skill_creation_confirm",
                "creation_id": creation_id,
                "prompt": "信息够了，确认后我帮你生成 Skill。",
            }

        yield {
            "type": "waiting_input",
            "execution_id": creation_id,
            "phase": "skill_creation",
        }

    async def _generate_skill(self, ctx: dict) -> AsyncIterator[dict]:
        """基于收集到的信息生成 Skill YAML"""
        yield {"type": "text_delta", "content": "\n\n好的，正在为你生成 Skill...\n\n"}

        history_text = "\n".join(
            f"{'用户' if h['role'] == 'user' else 'AI'}: {h['content']}"
            for h in ctx["history"]
        )

        messages = [
            ChatMessage(role="system", content=GENERATE_SYSTEM_PROMPT),
            ChatMessage(role="user", content=f"以下是和用户的对话记录，请根据对话内容生成 Skill YAML：\n\n{history_text}"),
        ]

        yaml_parts = []
        async for chunk in self.llm.chat_stream(messages):
            yaml_parts.append(chunk)
            yield {"type": "text_delta", "content": chunk}

        yaml_content = "".join(yaml_parts)

        yield {
            "type": "skill_created",
            "creation_id": ctx["creation_id"],
            "yaml_content": yaml_content,
        }
        yield {
            "type": "text_delta",
            "content": "\n\nSkill 已生成！你可以在 Skill 工作台中看到它。以后说触发词就能自动执行了。\n",
        }

        ctx["phase"] = "done"
        _active_creations.pop(ctx["creation_id"], None)


class MockSkillCreator:
    """Mock 模式的 Skill 创建器"""

    async def start_creation(
        self, user_message: str, conversation_id: str = "",
    ) -> AsyncIterator[dict]:
        creation_id = str(uuid.uuid4())
        ctx = {
            "creation_id": creation_id,
            "conversation_id": conversation_id,
            "phase": "collecting",
            "round": 0,
            "description": user_message,
        }
        _active_creations[creation_id] = ctx

        yield {"type": "skill_creation_start", "creation_id": creation_id}

        intro = (
            f"我来帮你把「{user_message}」变成一个自动执行的 Skill。\n\n"
            "先让我了解一下几个细节：\n\n"
            "**这个流程的第一步通常是做什么？**\n"
        )
        for char in intro:
            yield {"type": "text_delta", "content": char}
            await asyncio.sleep(0.008)

        yield {
            "type": "waiting_input",
            "execution_id": creation_id,
            "phase": "skill_creation",
        }

    async def continue_creation(
        self, creation_id: str, user_reply: str,
    ) -> AsyncIterator[dict]:
        ctx = _active_creations.get(creation_id)
        if not ctx:
            yield {"type": "error", "message": "创建会话已过期"}
            return

        ctx["round"] = ctx.get("round", 0) + 1

        questions = [
            "好的，记下了。**第二步呢？之后通常做什么？**",
            "明白了。**这个流程你一般多久做一次？每天、每周还是按需？**",
            "了解。**你觉得什么词最适合触发这个流程？比如说什么话的时候你想自动执行它？**",
        ]

        if ctx["round"] < len(questions):
            text = questions[ctx["round"]] + "\n"
            for char in text:
                yield {"type": "text_delta", "content": char}
                await asyncio.sleep(0.008)

            yield {
                "type": "waiting_input",
                "execution_id": creation_id,
                "phase": "skill_creation",
            }
        else:
            summary = (
                f"\n\n好的，我已经了解了你的工作流程。让我帮你生成 Skill...\n\n"
                f"---\n\n"
                f"```yaml\nskill_id: custom_{creation_id[:8]}\n"
                f"name: {ctx['description'][:20]}\n"
                f"description: 基于用户描述自动生成的工作流\n"
                f"version: 1\n"
                f"trigger_phrases:\n  - {ctx['description'][:15]}\n"
                f"intake:\n  - question_id: context\n    text: \"有什么需要我提前了解的吗？\"\n"
                f"steps:\n  - step_id: step_1\n    name: 执行步骤1\n    description: 根据用户描述执行\n```\n\n"
                f"---\n\n"
                f"**Skill 已生成！**（Mock模式）\n\n"
                f"在真实模式下，AI 会根据你描述的所有细节生成完整的 Skill 配置。\n"
            )
            for char in summary:
                yield {"type": "text_delta", "content": char}
                await asyncio.sleep(0.006)

            yield {
                "type": "skill_created",
                "creation_id": creation_id,
                "yaml_content": "(mock)",
            }

            ctx["phase"] = "done"
            _active_creations.pop(creation_id, None)
