"""从 YAML 文件加载 Skill 定义"""

import yaml
from pathlib import Path
from runner.skill_schema import SkillDefinition, StepDefinition, ToolCall, IntakeQuestion, TwinDimensionMapping

SKILLS_DIR = Path(__file__).parent.parent / "skills" / "presets"


def load_skill_from_yaml(yaml_path: str | Path) -> SkillDefinition:
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    intake = []
    for q in data.get("intake", []):
        intake.append(IntakeQuestion(
            question_id=q["question_id"],
            text=q["text"],
            options=q.get("options", []),
            allow_free_input=q.get("allow_free_input", True),
            allow_multiple=q.get("allow_multiple", False),
            required=q.get("required", True),
        ))

    steps = []
    for s in data.get("steps", []):
        tools = [ToolCall(**t) for t in s.get("tools", [])]
        steps.append(StepDefinition(
            step_id=s["step_id"],
            name=s["name"],
            description=s.get("description", ""),
            prompt_template=s.get("prompt_template", ""),
            tools=tools,
            reference_files=s.get("reference_files", []),
            output_format=s.get("output_format", "text"),
            checkpoint=s.get("checkpoint", False),
            checkpoint_prompt=s.get("checkpoint_prompt", ""),
        ))

    twin_dims = []
    for td in data.get("twin_dimensions", []):
        twin_dims.append(TwinDimensionMapping(
            dimension=td["dimension"],
            extract_keys=td.get("extract_keys", []),
        ))

    return SkillDefinition(
        skill_id=data["skill_id"],
        name=data["name"],
        description=data.get("description", ""),
        trigger_phrases=data.get("trigger_phrases", []),
        system_prompt=data.get("system_prompt", ""),
        intake=intake,
        steps=steps,
        output_template=data.get("output_template", ""),
        capture_prompt=data.get("capture_prompt", ""),
        version=data.get("version", 1),
        twin_dimensions=twin_dims,
    )


def load_all_preset_skills() -> dict[str, SkillDefinition]:
    skills = {}
    if not SKILLS_DIR.exists():
        return skills
    for skill_dir in SKILLS_DIR.iterdir():
        if not skill_dir.is_dir():
            continue
        yaml_file = skill_dir / "skill.yaml"
        if yaml_file.exists():
            skill = load_skill_from_yaml(yaml_file)
            skills[skill.skill_id] = skill
    return skills
