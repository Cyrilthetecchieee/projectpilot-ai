import os
from pathlib import Path

from dotenv import load_dotenv
from openai import APIError, OpenAI

# Load environment variables from backend/.env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

api_key = os.getenv("NEBIUS_API_KEY", "").strip()
base_url = os.getenv("NEBIUS_BASE_URL", "").strip()
model = os.getenv("NEBIUS_MODEL", "").strip()

if not api_key:
    print("Error: NEBIUS_API_KEY is not configured in backend/.env")
    raise SystemExit(1)

if not base_url or not model:
    print("Error: NEBIUS_BASE_URL or NEBIUS_MODEL is missing in backend/.env")
    raise SystemExit(1)

try:
    client = OpenAI(base_url=base_url, api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": "Reply exactly with: ProjectPilot Nebius connection successful",
            }
        ],
        max_tokens=64,
        temperature=0.0,
    )

    content = response.choices[0].message.content if response.choices else ""
    response_model = response.model or model
    usage = response.usage

    print("=== Nebius Connectivity Test Result ===")
    print(f"Model Name: {response_model}")
    print(f"Model Response: {content.strip()}")
    if usage:
        print(
            f"Token Usage: Prompt={usage.prompt_tokens}, "
            f"Completion={usage.completion_tokens}, "
            f"Total={usage.total_tokens}"
        )
    else:
        print("Token Usage: Not provided in response")
    print("Status: SUCCESS")

except APIError as e:
    print(f"Nebius API error ({e.__class__.__name__}): {e}")
    raise SystemExit(1)
except Exception as e:
    print(f"Nebius test failed ({type(e).__name__}): {e}")
    raise SystemExit(1)
