import json
import re
import time

from app.ai.nvidia_client import nvidia_client
from app.schemas import ProjectContext, RequirementAnalysis

SYSTEM_PROMPT = """You are the Requirement Agent inside ProjectPilot AI.

Your responsibility is to transform a raw engineering project idea into technically meaningful, structured engineering requirements.

Analyze only the supplied project information. Do not invent unsupported facts. If important information is missing, represent it as an assumption or open question. Return structured JSON only.

Use exactly this JSON shape:
{
  "problem": "Clear interpretation of the engineering problem",
  "functional_requirements": [{"title": "Requirement title", "description": "Clear engineering requirement", "priority": "critical|high|medium|low"}],
  "non_functional_requirements": [{"title": "Requirement title", "description": "Clear engineering requirement", "priority": "critical|high|medium|low"}],
  "constraints": ["constraint"],
  "assumptions": ["assumption"],
  "open_questions": ["question"]
}
"""


def _strip_json_fence(content: str) -> str:
    cleaned = content.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


class RequirementAgent:
    def analyze(self, project: ProjectContext) -> tuple[RequirementAnalysis, int]:
        prompt = json.dumps(
            {
                "project_name": project.name,
                "project_idea_or_problem": project.idea,
                "primary_objective": project.objective,
                "project_type": project.type,
                "available_technologies": project.technologies,
                "constraints": project.constraints,
                "timeline": project.timeline,
                "current_stage": project.stage,
            },
            ensure_ascii=True,
        )
        started = time.perf_counter()
        raw = nvidia_client.complete_json(SYSTEM_PROMPT, prompt)
        try:
            result = RequirementAnalysis.model_validate(json.loads(_strip_json_fence(raw)))
        except (json.JSONDecodeError, ValueError) as error:
            raise RuntimeError("Requirement Agent returned invalid structured JSON") from error
        return result, round((time.perf_counter() - started) * 1000)


requirement_agent = RequirementAgent()
