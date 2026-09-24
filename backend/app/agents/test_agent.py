import json
import re
import time

from app.ai.nebius_client import nebius_client
from app.schemas import (
    ArchitectureAnalysis,
    ExecutionPlan,
    ProjectContext,
    RequirementAnalysis,
    ReviewAnalysis,
    TestAnalysis,
)

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
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


class TestAgent:
    provider: str = "Nebius Token Factory"

    @property
    def model(self) -> str:
        return nebius_client.model

    def analyze(
        self,
        project: ProjectContext,
        requirements: RequirementAnalysis,
        architecture: ArchitectureAnalysis,
        plan: ExecutionPlan | None = None,
        review: ReviewAnalysis | None = None,
    ) -> tuple[TestAnalysis, int]:
        prompt_parts = [
            f"Project Name: {project.name}",
            f"Type: {project.type}",
            f"Objective: {project.objective}\n",
            f"Requirements:\n{requirements.model_dump_json(indent=2)}\n",
            f"Architecture:\n{architecture.model_dump_json(indent=2)}\n",
        ]
        if plan:
            prompt_parts.append(f"Execution Plan:\n{plan.model_dump_json(indent=2)}\n")
        if review:
            prompt_parts.append(f"Review Risks and Findings:\n{review.model_dump_json(indent=2)}\n")

        prompt = "\n".join(prompt_parts)
        started = time.perf_counter()
        raw = nebius_client.complete_json(SYSTEM_PROMPT, prompt)
        try:
            result = TestAnalysis.model_validate(json.loads(_strip_json_fence(raw)))
        except (json.JSONDecodeError, ValueError) as error:
            raise RuntimeError("Test Agent returned invalid structured JSON") from error
        return result, round((time.perf_counter() - started) * 1000)


test_agent = TestAgent()
