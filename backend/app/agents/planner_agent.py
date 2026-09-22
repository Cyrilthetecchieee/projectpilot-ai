import json
import os
import re
import time
from typing import Any

from pydantic import ValidationError

from app.ai.nvidia_client import NVIDIAResponse, nvidia_client
from app.schemas import ArchitectureAnalysis, ExecutionPlan, ProjectContext, RequirementAnalysis

SYSTEM_PROMPT = """You are the Planner Agent inside ProjectPilot AI.

Your responsibility is to convert an engineering project's validated requirements and architecture into a realistic, dependency-aware execution plan.

You are not a general chatbot.

Create concrete engineering work items that a project team could actually execute.

Every task must represent a meaningful engineering action.

Avoid vague tasks such as:
- Work on backend
- Complete hardware
- Do testing
- Improve system

Instead generate specific actions with measurable completion criteria.

Respect project constraints, technologies, timeline, current stage, requirements, architecture components, interfaces and identified architecture gaps.

Order work according to technical dependencies. Every task that relies on another task (e.g. implementation relying on interface definition, or verification relying on hardware assembly) MUST list those predecessor task IDs in its `dependencies` array.

Do not assume unavailable resources.

If architecture contains unresolved gaps, create appropriate planning tasks to resolve those gaps before dependent implementation tasks.

Return exactly ONE valid JSON object.
Do not include markdown.
Do not include ```json fences.
Do not include explanations before the JSON.
Do not include explanations after the JSON.
The first character of your final answer must be { and the last character must be }.
Follow the supplied schema exactly.

Use exactly this JSON shape:
{
  "summary": "Execution plan summary explaining the phasing strategy",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Milestone title",
      "description": "Milestone scope and goal",
      "order": 1
    }
  ],
  "tasks": [
    {
      "id": "task-1",
      "milestone_id": "milestone-1",
      "title": "Clear engineering action title",
      "description": "Specific technical details of what must be implemented, wired, or configured",
      "priority": "critical|high|medium|low",
      "status": "todo",
      "estimated_effort": "e.g. 2-4 hours or 1-2 days",
      "dependencies": [],
      "related_requirements": ["Requirement Title or FR-01"],
      "related_components": ["Component Name or ac-01"],
      "success_criteria": [
        "Observable criterion 1",
        "Observable criterion 2"
      ]
    }
  ],
  "critical_path": ["task-1"],
  "planning_notes": [
    "Technical risk or dependency note"
  ]
}
"""


def _parse_final_content(content: str) -> str:
    cleaned = content.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _normalize_plan_payload(payload: dict[str, Any]) -> dict[str, Any]:
    valid_priorities = {"critical", "high", "medium", "low"}
    for task in payload.get("tasks", []):
        priority = str(task.get("priority", "medium")).lower()
        task["priority"] = priority if priority in valid_priorities else "medium"
        task["status"] = "todo"
        if not isinstance(task.get("dependencies"), list):
            task["dependencies"] = []
        if not isinstance(task.get("related_requirements"), list):
            task["related_requirements"] = []
        if not isinstance(task.get("related_components"), list):
            task["related_components"] = []
        if not isinstance(task.get("success_criteria"), list):
            task["success_criteria"] = []
    if not isinstance(payload.get("milestones"), list):
        payload["milestones"] = []
    if not isinstance(payload.get("critical_path"), list):
        payload["critical_path"] = []
    if not isinstance(payload.get("planning_notes"), list):
        payload["planning_notes"] = []
    return payload


def _validate_relationships(plan: ExecutionPlan) -> tuple[bool, list[str]]:
    errors: list[str] = []
    milestone_ids = {m.id for m in plan.milestones}
    task_ids = {t.id for t in plan.tasks}

    for task in plan.tasks:
        if task.milestone_id not in milestone_ids:
            errors.append(f"Task '{task.id}' references non-existent milestone_id '{task.milestone_id}'")
        for dep in task.dependencies:
            if dep not in task_ids:
                errors.append(f"Task '{task.id}' references non-existent dependency task '{dep}'")
            if dep == task.id:
                errors.append(f"Task '{task.id}' cannot depend on itself")

    for cp_id in plan.critical_path:
        if cp_id not in task_ids:
            errors.append(f"Critical path references non-existent task '{cp_id}'")

    return len(errors) == 0, errors


def _sanitize_relationships(plan: ExecutionPlan) -> ExecutionPlan:
    milestone_ids = {m.id for m in plan.milestones}
    task_ids = {t.id for t in plan.tasks}
    fallback_milestone_id = plan.milestones[0].id if plan.milestones else "milestone-1"

    for task in plan.tasks:
        if task.milestone_id not in milestone_ids:
            task.milestone_id = fallback_milestone_id
        task.dependencies = [dep for dep in task.dependencies if dep in task_ids and dep != task.id]

    plan.critical_path = [cp for cp in plan.critical_path if cp in task_ids]
    return plan


class PlannerAgent:
    def analyze(
        self,
        project: ProjectContext,
        requirements: RequirementAnalysis,
        architecture: ArchitectureAnalysis,
    ) -> tuple[ExecutionPlan, int]:
        prompt = json.dumps(
            {
                "project_context": {
                    "name": project.name,
                    "idea_or_problem": project.idea,
                    "objective": project.objective,
                    "type": project.type,
                    "technologies": project.technologies,
                    "constraints": project.constraints,
                    "timeline": project.timeline,
                    "current_stage": project.stage,
                },
                "requirement_agent_output": {
                    "problem": requirements.problem,
                    "functional_requirements": [item.model_dump() for item in requirements.functional_requirements],
                    "non_functional_requirements": [item.model_dump() for item in requirements.non_functional_requirements],
                    "constraints": requirements.constraints,
                    "assumptions": requirements.assumptions,
                    "open_questions": requirements.open_questions,
                },
                "architecture_agent_output": {
                    "summary": architecture.summary,
                    "components": [comp.model_dump() for comp in architecture.components],
                    "connections": [conn.model_dump() for conn in architecture.connections],
                    "data_flow": [flow.model_dump() for flow in architecture.data_flow],
                    "architecture_decisions": [dec.model_dump() for dec in architecture.architecture_decisions],
                    "architecture_gaps": [gap.model_dump() for gap in architecture.architecture_gaps],
                },
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
            max_tokens=6000,
        )

        plan = self._parse(response, "first")
        if plan is not None:
            valid_rel, rel_errors = _validate_relationships(plan)
            if not valid_rel:
                repair_prompt = (
                    "Your previous execution plan had relationship reference errors:\n"
                    + "\n".join(rel_errors)
                    + "\n\nReturn the corrected execution plan data as exactly one valid JSON object.\n"
                    "Ensure every task.milestone_id matches an existing milestone.id, every task dependency matches an existing task.id, and all critical_path items match existing task.ids.\n"
                    "No markdown or code fences.\n\n"
                    f"Previous response:\n{response.content}"
                )
                response = nvidia_client.generate(
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": repair_prompt},
                    ],
                    response_format={"type": "json_object"},
                    enable_thinking=False,
                    max_tokens=6000,
                )
                plan = self._parse(response, "retry")
        else:
            repair_prompt = (
                "Your previous response was not valid JSON.\n"
                "Return the same execution plan data as exactly one valid JSON object matching the required schema.\n"
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
                max_tokens=6000,
            )
            plan = self._parse(response, "retry")

        if plan is None:
            raise RuntimeError("INVALID_AI_RESPONSE: Failed to parse execution plan")

        # Sanitize any remaining orphaned references safely
        plan = _sanitize_relationships(plan)
        duration_ms = round((time.perf_counter() - started) * 1000)
        return plan, duration_ms

    def _parse(self, response: NVIDIAResponse, attempt: str) -> ExecutionPlan | None:
        debug = os.getenv("NEMOTRON_DEBUG_RESPONSES", "0") == "1"
        if debug:
            print(f"Planner Agent {attempt} finish_reason={response.finish_reason} content_length={len(response.content)}")
        try:
            raw_text = _parse_final_content(response.content)
            parsed = json.loads(raw_text)
            normalized = _normalize_plan_payload(parsed)
            return ExecutionPlan.model_validate(normalized)
        except (json.JSONDecodeError, ValidationError) as error:
            if debug:
                print(f"Planner Agent {attempt} parse failed: {type(error).__name__}")
            return None


planner_agent = PlannerAgent()
