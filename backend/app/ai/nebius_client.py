import os
import typing
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@dataclass
class NebiusResponse:
    content: str
    reasoning_content: str | None
    finish_reason: str | None


class NebiusClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("NEBIUS_API_KEY", "").strip()
        self.base_url = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.us-central1.nebius.com/v1/").strip()
        self.model = os.getenv("NEBIUS_MODEL", "nvidia/Nemotron-3-Ultra-550b-a55b").strip()
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=True)
        self.api_key = os.getenv("NEBIUS_API_KEY", "").strip()
        self.base_url = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.us-central1.nebius.com/v1/").strip()
        self.model = os.getenv("NEBIUS_MODEL", "nvidia/Nemotron-3-Ultra-550b-a55b").strip()
        if not self.api_key:
            raise RuntimeError("NEBIUS_API_KEY is not configured. Please set NEBIUS_API_KEY in backend/.env")
        if not self.model:
            raise RuntimeError("NEBIUS_MODEL is not configured in backend/.env")
        if self._client is None or self._client.api_key != self.api_key or str(self._client.base_url) != self.base_url:
            self._client = OpenAI(base_url=self.base_url, api_key=self.api_key)
        return self._client

    def generate(
        self,
        messages: list[dict[str, typing.Any]],
        response_format: dict[str, str] | None = None,
        enable_thinking: bool = False,
        max_tokens: int = 4000,
    ) -> NebiusResponse:
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
            raise RuntimeError("Nebius returned an empty response")
        return NebiusResponse(
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


nebius_client = NebiusClient()
