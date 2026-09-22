import json
import re
import time

from app.ai.nvidia_client import nvidia_client
from app.schemas import ProjectContext, RequirementAnalysis, ArchitectureAnalysis, TestAnalysis

SYSTEM_PROMPT = """You are the Test Agent inside ProjectPilot AI.

Your responsibility is to generate a practical engineering verification strategy for the specific project, based on the requirements and architecture provided.

Analyze only the supplied project information. Generate structured test cases covering functional testing, integration, and failure/error scenarios where appropriate.

To optimize processing, you MUST strictly adhere to the following limits:
- Keep all descriptions concise and directly to the point
- Limit test cases to a maximum of 8
- Do not provide long explanations or markdown text outside the JSON

Use exactly this JSON shape:
{
  "summary": "Clear summary of the verification strategy",
  "test_cases": [
    {
      "scenario": "Short test scenario",
      "precondition": "Initial state or preconditions",
      "expected_result": "The expected outcome"
    }
  ]
}
"""

def _strip_json_fence(content: str) -> str:
    cleaned = content.strip()
    cleaned = re.sub(r"^`(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*`$", "", cleaned)
    return cleaned.strip()

class TestAgent:
    def analyze(self, project: ProjectContext, requirements: RequirementAnalysis, architecture: ArchitectureAnalysis) -> tuple[TestAnalysis, int]:
        prompt = (
            f"Project Name: {project.name}\n"
            f"Type: {project.type}\n"
            f"Objective: {project.objective}\n\n"
            f"Requirements:\n{requirements.model_dump_json(indent=2)}\n\n"
            f"Architecture:\n{architecture.model_dump_json(indent=2)}\n\n"
        )
        started = time.perf_counter()
        raw = nvidia_client.complete_json(SYSTEM_PROMPT, prompt)
        try:
            result = TestAnalysis.model_validate(json.loads(_strip_json_fence(raw)))
        except (json.JSONDecodeError, ValueError) as error:
            raise RuntimeError("Test Agent returned invalid structured JSON") from error
        return result, round((time.perf_counter() - started) * 1000)

test_agent = TestAgent()
