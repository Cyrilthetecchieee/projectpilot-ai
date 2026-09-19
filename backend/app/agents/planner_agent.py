import json
import os
import time

from pydantic import ValidationError

from app.ai.nvidia_client import NVIDIAResponse, nvidia_client
from app.schemas import (
    ArchitectureAnalysis,
    ExecutionPlan,
    ProjectContext,
    RequirementAnalysis,
)

SYSTEM_PROMPT = """You are the Planner Agent inside ProjectPilot AI.

Your responsibility is to convert an engineering project's validated requirements and architecture into a realistic, dependency-aware execution plan.

You are not a general chatbot.

Create concrete engineering work items that a project team could actually execute. Every task must represent a meaningful engineering action.

Avoid vague tasks such as:
- Work on backend
- Complete hardware
- Do testing
- Improve system

Instead generate specific actions with measurable completion criteria.

Respect project constraints, technologies, timeline, current stage, requirements, architecture components, interfaces and identified architecture gaps.

Order work according to technical dependencies. Explicitly list task dependencies using task IDs.

Do not assume unavailable resources.

If architecture contains unresolved gaps, create appropriate planning tasks to resolve those gaps before dependent implementation tasks.

Link tasks to the requirements and architecture components they relate to using the related_requirements and related_components fields.

To optimize processing, you MUST strictly adhere to the following limits:
- Maximum 3 milestones
- Maximum 8 tasks in total
- Keep task descriptions, success criteria, and planning notes extremely concise
- Do not provide long explanations or markdown text outside the JSON

Return exactly ONE valid JSON object matching the supplied schema.
Do not return markdown.
Do not return code fences.
Do not return explanatory text outside the JSON.
The first character of your final answer must be { and the last character must be }.

Use exactly this JSON shape:
{
  "summary": "Execution plan summary",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Milestone title",
      "description": "Milestone description",
      "order": 1
    }
  ],
  "tasks": [
    {
      "id": "task-1",
      "milestone_id": "milestone-1",
      "title": "Task title",
      "description": "Detailed task description",
      "priority": "critical|high|medium|low",
      "status": "todo",
      "estimated_effort": "2-3 hours",
      "dependencies": [],
      "related_requirements": ["Requirement title"],
      "related_components": ["Component name"],
      "success_criteria": ["Measurable criterion"]
    }
  ],
  "critical_path": ["task-1", "task-3"],
  "planning_notes": ["Important planning observation"]
}
"""


def _parse_final_content(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```json") and cleaned.endswith("```"):
        return cleaned[len("```json"):-len("```")].strip()
    if cleaned.startswith("```") and cleaned.endswith("```"):
        return cleaned[len("```"):-len("```")].strip()
    return cleaned


class PlannerAgent:
    def analyze(
        self,
        project: ProjectContext,
        requirements: RequirementAnalysis,
        architecture: ArchitectureAnalysis,
    ) -> tuple[ExecutionPlan, int]:
        prompt = json.dumps(
            {
                "project": {
                    "name": project.name,
                    "problem": requirements.problem,
                    "objective": project.objective,
                    "type": project.type,
                    "technologies": project.technologies,
                    "constraints": project.constraints,
                    "timeline": project.timeline,
                    "stage": project.stage,
                },
                "requirement_agent_output": requirements.model_dump(),
                "architecture_agent_output": architecture.model_dump(),
            },
            ensure_ascii=True,
        )
        started = time.perf_counter()
        response = nvidia_client.generate(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            enable_thinking=False,
            max_tokens=8000,
        )
        result = self._parse(response, "first")
        if result is None:
            repair_prompt = (
                "Your previous response was not valid JSON.\n"
                "Return the same execution plan as exactly one valid JSON object matching the required schema.\n"
                "No markdown or explanatory text.\n\n"
                f"Previous response:\n{response.content}"
            )
            response = nvidia_client.generate(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": repair_prompt},
                ],
                response_format={"type": "json_object"},
                enable_thinking=False,
                max_tokens=8000,
            )
            result = self._parse(response, "retry")
        if result is None:
            raise RuntimeError("INVALID_AI_RESPONSE")
        return result, round((time.perf_counter() - started) * 1000)

    def _parse(self, response: NVIDIAResponse, attempt: str) -> ExecutionPlan | None:
        debug = os.getenv("NEMOTRON_DEBUG_RESPONSES", "0") == "1"
        if debug:
            print(f"Planner Agent {attempt} finish_reason={response.finish_reason} content_length={len(response.content)}")
            print("RAW CONTENT START")
            print(response.content.encode("ascii", "backslashreplace").decode("ascii"))
            print("RAW CONTENT END")
            print(f"reasoning_content_present={bool(response.reasoning_content)}")
        try:
            parsed = json.loads(_parse_final_content(response.content))
            return ExecutionPlan.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as error:
            if debug:
                print(f"Planner Agent {attempt} parse failed: {type(error).__name__}")
            return None


planner_agent = PlannerAgent()

