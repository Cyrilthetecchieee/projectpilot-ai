import os
from pathlib import Path

from dotenv import load_dotenv
from openai import APIStatusError, AuthenticationError, NotFoundError, OpenAI, RateLimitError


load_dotenv(Path(__file__).with_name(".env"))

api_key = os.getenv("NVIDIA_API_KEY", "").strip()
base_url = os.getenv("NVIDIA_BASE_URL", "").strip()
model = os.getenv("NEMOTRON_REASONING_MODEL", "").strip()

if not api_key:
    print("NVIDIA_API_KEY is not configured.")
    raise SystemExit(0)

if not base_url or not model:
    print("NVIDIA connection configuration is incomplete.")
    raise SystemExit(1)

try:
    client = OpenAI(base_url=base_url, api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": "Reply with exactly: ProjectPilot Nemotron connection successful",
            }
        ],
        max_tokens=32,
        stream=False,
        extra_body={"chat_template_kwargs": {"enable_thinking": False}},
    )
    message = response.choices[0].message.content or ""
    print("Provider: NVIDIA")
    print(f"Model: {model}")
    print("Status: CONNECTED")
    print(message)
except AuthenticationError:
    print("Authentication failed.")
    raise SystemExit(1)
except RateLimitError:
    print("Provider rate limit or quota issue.")
    raise SystemExit(1)
except NotFoundError:
    print("Configured model is unavailable.")
    raise SystemExit(1)
except APIStatusError as error:
    if error.status_code in (401, 403):
        print("Authentication failed.")
    elif error.status_code in (404, 400):
        print("Configured model is unavailable.")
    elif error.status_code == 429:
        print("Provider rate limit or quota issue.")
    else:
        print(f"NVIDIA request failed with status {error.status_code}.")
    raise SystemExit(1)
except Exception as error:
    error_type = type(error).__name__
    print(f"NVIDIA connectivity test failed ({error_type}).")
    raise SystemExit(1)
