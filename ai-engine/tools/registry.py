"""
Tool 注册表：管理所有可用的 Tool，供 Skill 步骤调用。

Tool 分三类：
1. 平台内置 Tool（查企业资产、读文件、数学计算等）
2. 数据源 Tool（查电商平台数据、外部 API 等）
3. 用户自定义 Tool（后续支持）

每个 Tool 是一个 async 函数，接收 params dict，返回结果字符串。
"""

from __future__ import annotations
import logging
from typing import Any, Callable, Awaitable

logger = logging.getLogger(__name__)

ToolFunc = Callable[[dict[str, Any]], Awaitable[str]]

_tool_registry: dict[str, "ToolInfo"] = {}


class ToolInfo:
    def __init__(
        self,
        name: str,
        description: str,
        func: ToolFunc,
        category: str = "builtin",
        param_schema: dict[str, str] | None = None,
    ):
        self.name = name
        self.description = description
        self.func = func
        self.category = category
        self.param_schema = param_schema or {}

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "params": self.param_schema,
        }


def register_tool(
    name: str,
    description: str,
    func: ToolFunc,
    category: str = "builtin",
    param_schema: dict[str, str] | None = None,
):
    _tool_registry[name] = ToolInfo(
        name=name,
        description=description,
        func=func,
        category=category,
        param_schema=param_schema,
    )
    logger.info(f"Registered tool: {name} [{category}]")


def get_tool(name: str) -> ToolInfo | None:
    return _tool_registry.get(name)


def list_tools(category: str = "") -> list[ToolInfo]:
    if category:
        return [t for t in _tool_registry.values() if t.category == category]
    return list(_tool_registry.values())


async def execute_tool(name: str, params: dict[str, Any]) -> str:
    tool = _tool_registry.get(name)
    if not tool:
        return f"[Tool Error] Tool '{name}' not found"
    try:
        result = await tool.func(params)
        return result
    except Exception as e:
        logger.error(f"Tool {name} execution failed: {e}")
        return f"[Tool Error] {name}: {str(e)}"
