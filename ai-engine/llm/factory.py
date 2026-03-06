from llm.base import BaseLLM
from llm.qwen_client import QwenClient


def create_llm(provider: str = "qwen") -> BaseLLM:
    if provider == "qwen":
        return QwenClient()
    raise ValueError(f"Unknown provider: {provider}")
