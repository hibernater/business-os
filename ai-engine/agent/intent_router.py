"""意图路由器：判断用户消息的意图，决定执行路径"""

from __future__ import annotations
import json
from dataclasses import dataclass
from enum import Enum
from llm.base import BaseLLM, ChatMessage
from runner.skill_schema import SkillDefinition


class Intent(str, Enum):
    EXECUTE_SKILL = "execute_skill"
    CREATE_SKILL = "create_skill"
    CHAT = "chat"
    QUERY_DATA = "query_data"


@dataclass
class IntentResult:
    intent: Intent
    skill_id: str | None = None
    skill_name: str | None = None
    confidence: float = 0.0
    reasoning: str = ""


INTENT_SYSTEM_PROMPT = """你是一个意图识别引擎，负责判断用户消息应该触发哪种操作。

可用的 Skill 列表：
{skill_list}

你需要将用户消息分类为以下四种意图之一：
1. execute_skill - 用户想要执行某个已有的 Skill（匹配到了触发词或意图）
2. create_skill - 用户描述了一个新的工作流程，想让系统帮他创建一个 Skill
3. query_data - 用户想查询经营数据、资产信息
4. chat - 普通闲聊、问答、咨询

请严格按照以下 JSON 格式输出，不要输出其他内容：
{{"intent": "execute_skill|create_skill|query_data|chat", "skill_id": "匹配到的skill_id或null", "confidence": 0.0到1.0, "reasoning": "简短的判断理由"}}"""


def _build_skill_list_text(skills: dict[str, SkillDefinition]) -> str:
    if not skills:
        return "（暂无可用 Skill）"
    lines = []
    for s in skills.values():
        triggers = "、".join(s.trigger_phrases[:5])
        lines.append(f"- {s.skill_id}: {s.name} — {s.description[:60]}... 触发词: [{triggers}]")
    return "\n".join(lines)


async def route_intent(
    llm: BaseLLM,
    user_message: str,
    available_skills: dict[str, SkillDefinition],
    history: list[ChatMessage] | None = None,
) -> IntentResult:
    """用 LLM 判断意图。如果 LLM 不可用，用关键词匹配做降级。"""

    # 先做关键词快速匹配（作为 LLM 降级方案也作为快速路径）
    keyword_result = _keyword_match(user_message, available_skills)
    if keyword_result and keyword_result.confidence >= 0.9:
        return keyword_result

    # 用 LLM 做精确意图识别
    try:
        skill_list_text = _build_skill_list_text(available_skills)
        system = INTENT_SYSTEM_PROMPT.format(skill_list=skill_list_text)

        messages = [
            ChatMessage(role="system", content=system),
            ChatMessage(role="user", content=user_message),
        ]

        response = await llm.chat(messages)
        return _parse_llm_response(response.content, available_skills)
    except Exception:
        # LLM 调用失败，使用关键词匹配结果或默认 chat
        return keyword_result or IntentResult(intent=Intent.CHAT, confidence=0.5, reasoning="LLM不可用，默认闲聊")


def _keyword_match(
    message: str, skills: dict[str, SkillDefinition]
) -> IntentResult | None:
    msg_lower = message.lower().strip()
    best_match: tuple[str, str, float] | None = None

    for skill in skills.values():
        for phrase in skill.trigger_phrases:
            if phrase in msg_lower:
                score = len(phrase) / max(len(msg_lower), 1)
                confidence = min(0.6 + score * 0.4, 1.0)
                if best_match is None or confidence > best_match[2]:
                    best_match = (skill.skill_id, skill.name, confidence)

    if best_match:
        return IntentResult(
            intent=Intent.EXECUTE_SKILL,
            skill_id=best_match[0],
            skill_name=best_match[1],
            confidence=best_match[2],
            reasoning=f"关键词匹配到 Skill: {best_match[1]}",
        )
    return None


def _parse_llm_response(
    text: str, available_skills: dict[str, SkillDefinition]
) -> IntentResult:
    text = text.strip()
    # 尝试提取 JSON（LLM 可能包裹在 markdown 代码块中）
    if "```" in text:
        start = text.index("```") + 3
        if text[start:].startswith("json"):
            start += 4
        end = text.index("```", start)
        text = text[start:end].strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return IntentResult(intent=Intent.CHAT, confidence=0.3, reasoning="无法解析LLM输出")

    intent_str = data.get("intent", "chat")
    try:
        intent = Intent(intent_str)
    except ValueError:
        intent = Intent.CHAT

    skill_id = data.get("skill_id")
    skill_name = None
    if skill_id and skill_id in available_skills:
        skill_name = available_skills[skill_id].name
    elif intent == Intent.EXECUTE_SKILL:
        intent = Intent.CHAT

    return IntentResult(
        intent=intent,
        skill_id=skill_id,
        skill_name=skill_name,
        confidence=data.get("confidence", 0.7),
        reasoning=data.get("reasoning", ""),
    )
