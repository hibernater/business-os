from abc import ABC, abstractmethod
from typing import AsyncIterator

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class LLMResponse(BaseModel):
    content: str
    model: str
    usage: dict | None = None


class BaseLLM(ABC):
    @abstractmethod
    async def chat(self, messages: list[ChatMessage], **kwargs) -> LLMResponse:
        pass

    @abstractmethod
    async def chat_stream(
        self, messages: list[ChatMessage], **kwargs
    ) -> AsyncIterator[str]:
        pass
