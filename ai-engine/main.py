import json
import asyncio

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import DASHSCOPE_API_KEY, JAVA_BACKEND_URL
from tools.builtin import register_builtin_tools
from tools.ecommerce import register_ecommerce_tools
from tools.registry import list_tools

app = FastAPI(title="Business OS AI Engine")

register_builtin_tools()
register_ecommerce_tools()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: str = ""
    history: list[HistoryItem] = []
    auto_execute: bool = False
    enterprise_id: str = ""
    task_id: str = ""


def _get_agent():
    if DASHSCOPE_API_KEY and DASHSCOPE_API_KEY != "your_dashscope_api_key_here":
        from llm.factory import create_llm
        from agent.main_agent import MainAgent
        return MainAgent(create_llm("qwen"))
    return None


_agent = None


def get_agent():
    global _agent
    if _agent is None:
        _agent = _get_agent()
    return _agent


@app.get("/health")
async def health():
    mode = "llm" if get_agent() else "mock"
    from runner.skill_loader import load_all_preset_skills
    skills = load_all_preset_skills()
    return {
        "status": "ok",
        "mode": mode,
        "skills_loaded": list(skills.keys()),
    }


@app.get("/api/skills")
async def list_skills():
    """返回所有可用 Skill 的元数据"""
    from runner.skill_loader import load_all_preset_skills
    skills = load_all_preset_skills()
    result = []
    for s in skills.values():
        result.append({
            "skill_id": s.skill_id,
            "name": s.name,
            "description": s.description,
            "skill_type": s.skill_type,
            "version": s.version,
            "trigger_phrases": s.trigger_phrases,
            "intake_count": len(s.intake),
            "step_count": s.step_count,
            "steps": [{"step_id": st.step_id, "name": st.name, "description": st.description} for st in s.steps],
            "source": "preset",
            "industry": s.industry,
            "icon": s.icon,
            "usage_count": s.usage_count,
            "quick_setup": [
                {"question": qs.question, "field": qs.field, "options": qs.options}
                for qs in s.quick_setup
            ],
        })
    return {"skills": result}


@app.get("/api/skills/recommendations")
async def skill_recommendations(enterprise_id: str = ""):
    """基于企业资产智能推荐 Skill"""
    from recommend.skill_recommender import get_recommendations
    recs = await get_recommendations(enterprise_id)
    return {"recommendations": recs}


class DocAnalyzeRequest(BaseModel):
    content: str
    filename: str = ""


@app.post("/api/analyze-document")
async def analyze_document_api(req: DocAnalyzeRequest):
    """分析文档内容，推荐可生成的 Skill"""
    from generator.doc_skill_generator import analyze_document
    suggestions = await analyze_document(req.content, req.filename)
    return {"suggestions": suggestions}


class WizardRequest(BaseModel):
    scene: str
    answers: dict = {}


@app.post("/api/skills/generate-from-wizard")
async def generate_from_wizard(req: WizardRequest):
    """引导式创建 Skill"""
    from generator.doc_skill_generator import generate_skill_from_wizard
    agent = get_agent()
    llm = agent.llm if agent else None
    result = await generate_skill_from_wizard(req.scene, req.answers, llm)
    return result


@app.get("/api/tools")
async def get_tools():
    """列出所有可用的 Tool"""
    tools = list_tools()
    return {"tools": [t.to_dict() for t in tools]}


class ScheduleRequest(BaseModel):
    skill_id: str
    enterprise_id: str
    cron_expr: str = ""
    interval_minutes: int = 0


@app.get("/api/schedules")
async def list_schedules(enterprise_id: str = ""):
    from scheduler.engine import list_schedules
    schedules = list_schedules(enterprise_id)
    return {"schedules": [s.to_dict() for s in schedules]}


@app.post("/api/schedules")
async def create_schedule_api(req: ScheduleRequest):
    from scheduler.engine import create_schedule
    try:
        config = create_schedule(
            skill_id=req.skill_id,
            enterprise_id=req.enterprise_id,
            cron_expr=req.cron_expr,
            interval_minutes=req.interval_minutes,
        )
        return {"status": "ok", "schedule": config.to_dict()}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule_api(schedule_id: str):
    from scheduler.engine import delete_schedule
    ok = delete_schedule(schedule_id)
    return {"status": "ok" if ok else "not_found"}


@app.put("/api/schedules/{schedule_id}/toggle")
async def toggle_schedule_api(schedule_id: str, enabled: bool = True):
    from scheduler.engine import toggle_schedule
    config = toggle_schedule(schedule_id, enabled)
    if config:
        return {"status": "ok", "schedule": config.to_dict()}
    return {"status": "not_found"}


# ========== 自动执行入口（被调度器回调） ==========

@app.post("/api/internal/auto-run")
async def auto_run_skill(req: dict):
    """被调度器调用，自动模式执行 Skill"""
    from runner.skill_loader import load_all_preset_skills
    from runner.skill_runner import SkillRunner
    from runner.task_lifecycle import create_task

    skill_id = req.get("skill_id", "")
    enterprise_id = req.get("enterprise_id", "")
    skills = load_all_preset_skills()

    if skill_id not in skills:
        return {"status": "error", "message": f"Skill {skill_id} not found"}

    skill = skills[skill_id]

    agent = get_agent()
    if not agent:
        return {"status": "error", "message": "No LLM available"}

    task_id = await create_task(
        enterprise_id=enterprise_id,
        skill_id=skill_id,
        skill_name=skill.name,
        total_steps=skill.step_count,
        trigger_type="scheduled",
        schedule_id=req.get("schedule_id"),
    )

    runner = SkillRunner(agent.llm)
    results = []
    async for event in runner.start_execution(
        skill=skill,
        user_input=f"[定时自动执行] {skill.name}",
        enterprise_id=enterprise_id,
        conversation_id="",
        auto_execute=True,
        task_id=task_id or "",
    ):
        results.append(event)

    return {"status": "ok", "events_count": len(results), "task_id": task_id}


class SkillCreateRequest(BaseModel):
    name: str
    description: str
    trigger_phrases: list[str] = []
    intake_yaml: str = ""
    steps_yaml: str = ""


@app.post("/api/skills/generate")
async def generate_skill(req: SkillCreateRequest):
    """AI 辅助生成 Skill YAML（用于对话式 Skill 创建）"""
    agent = get_agent()
    if not agent:
        return {"status": "error", "message": "需要 LLM 才能生成 Skill"}

    from llm.base import ChatMessage
    prompt = f"""请根据以下信息生成一个 Skill 的 YAML 定义。

Skill名称：{req.name}
Skill描述：{req.description}
触发词：{', '.join(req.trigger_phrases) if req.trigger_phrases else '待定'}

请生成完整的 skill.yaml 内容，包含：
- skill_id (英文，下划线分隔)
- name, description, trigger_phrases
- system_prompt
- intake (采集问题，3-5个)
- steps (执行步骤，3-5个，包含 prompt_template)
- capture_prompt

只输出 YAML 内容，不要其他解释。"""

    messages = [
        ChatMessage(role="system", content="你是一个 Skill 配置专家。用户描述一个业务流程，你生成对应的 YAML 配置。"),
        ChatMessage(role="user", content=prompt),
    ]
    response = await agent.llm.chat(messages)
    return {"status": "ok", "yaml_content": response.content}


class WorkflowDecomposeRequest(BaseModel):
    description: str
    enterprise_id: str = ""


@app.post("/api/workflows/decompose")
async def decompose_workflow_api(req: WorkflowDecomposeRequest):
    """自然语言 → 工作流结构"""
    from workflow.decomposer import decompose_workflow
    agent = get_agent()
    llm = agent.llm if agent else None
    result = await decompose_workflow(req.description, llm)
    return result


@app.post("/api/workflows/heartbeat")
async def workflow_heartbeat(req: dict):
    """Process one heartbeat tick for a running workflow execution."""
    from workflow.executor import heartbeat_tick
    execution = req.get("execution", {})
    workflow = req.get("workflow", {})
    agent = get_agent()
    llm = agent.llm if agent else None
    try:
        event = await heartbeat_tick(execution, workflow, llm)
        return {"status": "ok", "event": event}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/workflows/presets")
async def list_preset_workflows():
    """列出预设工作流模板"""
    import yaml
    from pathlib import Path
    presets_dir = Path(__file__).parent / "workflows" / "presets"
    results = []
    if presets_dir.exists():
        for f in sorted(presets_dir.glob("*.yaml")):
            with open(f, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
                results.append(data)
    return {"presets": results}


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    agent = get_agent()

    async def event_generator():
        if agent:
            from llm.base import ChatMessage
            history = [ChatMessage(role=h.role, content=h.content) for h in req.history]
            async for event in agent.chat_stream(
                req.message, req.conversation_id, history,
                auto_execute=req.auto_execute, task_id=req.task_id,
            ):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        else:
            async for event in _mock_chat_stream(req):
                yield json.dumps(event, ensure_ascii=False) + "\n"

        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


async def _mock_chat_stream(req: ChatRequest):
    """Mock 模式：支持交互式 Skill、Skill 创建和普通对话"""
    from runner.skill_loader import load_all_preset_skills
    from runner.skill_runner import MockSkillRunner, get_execution_by_conversation
    from agent.skill_creator import MockSkillCreator, get_creation_by_conversation
    from agent.intent_router import _keyword_match, Intent

    skills = load_all_preset_skills()

    # 续接 Skill 执行
    active_ctx = get_execution_by_conversation(req.conversation_id)
    if active_ctx:
        runner = MockSkillRunner()
        async for event in runner.continue_execution(active_ctx.execution_id, req.message):
            yield event
        return

    # 续接 Skill 创建
    active_creation = get_creation_by_conversation(req.conversation_id)
    if active_creation:
        creator = MockSkillCreator()
        async for event in creator.continue_creation(active_creation["creation_id"], req.message):
            yield event
        return

    intent = _keyword_match(req.message, skills)

    if intent and intent.intent == Intent.EXECUTE_SKILL and intent.skill_id:
        yield {
            "type": "intent",
            "intent": "execute_skill",
            "skill_id": intent.skill_id,
            "skill_name": intent.skill_name,
            "confidence": intent.confidence,
            "reasoning": intent.reasoning,
        }

        skill = skills[intent.skill_id]
        runner = MockSkillRunner()
        async for event in runner.start_execution(
            skill=skill, user_input=req.message, conversation_id=req.conversation_id,
            auto_execute=req.auto_execute, task_id=req.task_id,
        ):
            yield event

    elif _is_create_skill_intent(req.message):
        yield {
            "type": "intent",
            "intent": "create_skill",
            "skill_id": None,
            "skill_name": None,
            "confidence": 0.8,
            "reasoning": "关键词匹配-Skill创建",
        }
        creator = MockSkillCreator()
        async for event in creator.start_creation(
            user_message=req.message, conversation_id=req.conversation_id,
        ):
            yield event

    else:
        yield {
            "type": "intent",
            "intent": "chat",
            "skill_id": None,
            "skill_name": None,
            "confidence": 0.5,
            "reasoning": "Mock模式-关键词未匹配",
        }

        mock_response = (
            f"收到你的消息：「{req.message}」\n\n"
            "我是商家OS的AI助手（Mock模式）。\n\n"
            "**试试这些操作：**\n"
        )
        for s in skills.values():
            triggers = "、".join(s.trigger_phrases[:3])
            mock_response += f"- 📦 **{s.name}**（说：{triggers}）\n"
        mock_response += "- 🔧 **创建新Skill**（说：「我每天会先...然后...」描述你的工作流程）\n"

        for char in mock_response:
            yield {"type": "text_delta", "content": char}
            await asyncio.sleep(0.008)


def _is_create_skill_intent(message: str) -> bool:
    create_keywords = [
        "我每天", "我一般", "我通常", "我的流程", "帮我创建", "创建一个skill",
        "创建一个工作流", "做个skill", "我想自动化", "帮我把这个流程",
        "我的工作流", "每天早上我会", "每周我要",
    ]
    return any(k in message.lower() for k in create_keywords)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8081, reload=True)
