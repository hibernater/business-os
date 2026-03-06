import asyncio
import queue
import threading
from typing import AsyncIterator

import dashscope
from dashscope import Generation

from config import DASHSCOPE_API_KEY, LLM_MODEL
from llm.base import BaseLLM, ChatMessage, LLMResponse

dashscope.api_key = DASHSCOPE_API_KEY

_SENTINEL = object()


class QwenClient(BaseLLM):
    def __init__(self, model: str | None = None):
        self.model = model or LLM_MODEL

    async def chat(self, messages: list[ChatMessage], **kwargs) -> LLMResponse:
        msgs = [{"role": m.role, "content": m.content} for m in messages]
        response = await asyncio.to_thread(
            Generation.call,
            model=self.model,
            messages=msgs,
            result_format="message",
            **kwargs,
        )
        content = response.output.choices[0].message.content
        return LLMResponse(
            content=content,
            model=self.model,
            usage=response.usage and dict(response.usage),
        )

    async def chat_stream(
        self, messages: list[ChatMessage], **kwargs
    ) -> AsyncIterator[str]:
        msgs = [{"role": m.role, "content": m.content} for m in messages]
        q: queue.Queue = queue.Queue()

        def _producer():
            try:
                responses = Generation.call(
                    model=self.model,
                    messages=msgs,
                    result_format="message",
                    stream=True,
                    incremental_output=True,
                    **kwargs,
                )
                for resp in responses:
                    if resp.output and resp.output.choices:
                        delta = resp.output.choices[0].message.content
                        if delta:
                            q.put(delta)
            except Exception as e:
                q.put(e)
            finally:
                q.put(_SENTINEL)

        threading.Thread(target=_producer, daemon=True).start()

        while True:
            chunk = await asyncio.to_thread(q.get)
            if chunk is _SENTINEL:
                break
            if isinstance(chunk, Exception):
                raise chunk
            yield chunk
