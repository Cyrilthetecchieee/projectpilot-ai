import json
import os
import re
import time

from pydantic import ValidationError

from app.ai.nebius_client import NebiusResponse, nebius_client
from app.schemas import ProjectContext, RequirementAnalysis

SYSTEM_PROMPT = """You are the Requirement Agent inside ProjectPilot AI.

Your responsibility is to transform a raw engineering project idea into technically meaningful, structured engineering requirements.

Analyze only the supplied project information. Do not invent unsupported facts. If important information is missing, represent it as an assumption or open question.

Return exactly ONE valid JSON object.
Do not include markdown.
Do not include ```json fences.
Do not include explanations before the JSON.
Do not include explanations after the JSON.
The first character of your final answer must be { and the last character must be }.

To optimize processing, you MUST strictly adhere to the following limits:
- Maximum 5 functional_requirements
- Maximum 4 non_functional_requirements
- Maximum 3 assumptions
- Maximum 3 open_questions
- Keep all descriptions concise and directly to the point
- Do not provide long explanations or markdown text outside the JSON

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
    provider: str = "Nebius Token Factory"

    @property
    def model(self) -> str:
        return nebius_client.model

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
        response = nebius_client.generate(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            enable_thinking=False,
            max_tokens=4000,
        )
        result = self._parse(response, "first")
        if result is None:
            repair_prompt = (
                "Your previous response was not valid JSON.\n"
                "Return the same requirements data as exactly one valid JSON object matching the required schema.\n"
                "No markdown or explanatory text.\n\n"
                f"Previous response:\n{response.content}"
            )
            response = nebius_client.generate(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": repair_prompt},
                ],
                response_format={"type": "json_object"},
                enable_thinking=False,
                max_tokens=4000,
            )
            result = self._parse(response, "retry")
        if result is None:
            raise RuntimeError("Requirement Agent returned invalid structured JSON")
        return result, round((time.perf_counter() - started) * 1000)

    def _parse(self, response: NebiusResponse, attempt: str) -> RequirementAnalysis | None:
        debug = os.getenv("NEBIUS_DEBUG_RESPONSES", os.getenv("NEMOTRON_DEBUG_RESPONSES", "0")) == "1"
        if debug:
            print(f"Requirement Agent {attempt} finish_reason={response.finish_reason} content_length={len(response.content)}")
        try:
            parsed = json.loads(_strip_json_fence(response.content))
            # Normalize priority values
            valid_priorities = {"critical", "high", "medium", "low"}
            for req_list in ("functional_requirements", "non_functional_requirements"):
                for item in parsed.get(req_list, []):
                    priority = str(item.get("priority", "medium")).lower()
                    item["priority"] = priority if priority in valid_priorities else "medium"
            return RequirementAnalysis.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as error:
            if debug:
                print(f"Requirement Agent {attempt} parse failed: {type(error).__name__}")
            return None


requirement_agent = RequirementAgent()
