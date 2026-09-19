import typing
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@dataclass
class NVIDIAResponse:
    content: str
    reasoning_content: str | None
    finish_reason: str | None


class NVIDIAClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("NVIDIA_API_KEY", "").strip()
        self.base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").strip()
        self.model = os.getenv("NEMOTRON_REASONING_MODEL", "").strip()
        if not self.api_key:
            raise RuntimeError("NVIDIA_API_KEY is not configured")
        if not self.model:
            raise RuntimeError("NEMOTRON_REASONING_MODEL is not configured")
        self.client = OpenAI(base_url=self.base_url, api_key=self.api_key)

    def generate(
        self,
        messages: list[dict[str, typing.Any]],
        response_format: dict[str, str] | None = None,
        enable_thinking: bool = False,
        max_tokens: int = 1800,
    ) -> NVIDIAResponse:
        request: dict[str, object] = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "top_p": 0.9,
            "stream": False,
            "extra_body": {"chat_template_kwargs": {"enable_thinking": enable_thinking}},
        }
        if response_format is not None:
            request["response_format"] = response_format
        response = self.client.chat.completions.create(
            **request,
        )
        message = response.choices[0].message
        content = message.content or ""
        if not content:
            raise RuntimeError("Nemotron returned an empty response")
        return NVIDIAResponse(
            content=content,
            reasoning_content=getattr(message, "reasoning_content", None),
            finish_reason=response.choices[0].finish_reason,
        )

    def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        return self.generate(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        ).content


nvidia_client = NVIDIAClient()
