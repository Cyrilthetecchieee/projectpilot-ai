import json
import os
import re
import time
from typing import Any

from pydantic import ValidationError

from app.ai.nebius_client import NebiusResponse, nebius_client
from app.ai.quality_guard import quality_guard
from app.schemas import ArchitectureAnalysis, ExecutionPlan, ProjectContext, RequirementAnalysis

SYSTEM_PROMPT = """You are the Planner Agent inside ProjectPilot AI.

Your responsibility is to convert an engineering project's validated requirements and architecture into a realistic, project-specific, dependency-aware execution plan.

You are not a general chatbot.

CRITICAL TASK SPECIFICITY GUIDELINES:
1. Every task must directly implement the concrete architecture components, interfaces, and requirements generated for THIS project.
2. Avoid generic tasks such as:
   - "Define interfaces"
   - "Confirm success criteria"
   - "Define system interfaces"
   - "Implement core system"
   - "Validate functionality"
   - "Complete hardware"
   - "Work on backend"
   - "Do testing"
   - "Setup project"
3. Each task title and description must explicitly state WHAT specific engineering artifact, module, circuit, API, protocol, or physical assembly is being built, configured, or tested (e.g. "Wire and calibrate ESP32 ADC for MQ-135 analog telemetry", "Implement Firebase Cloud Function for real-time alert processing", "Design composite thermal barrier test coupon layout").
4. Every task MUST maintain strict traceability:
   - `related_requirements`: List the exact requirement titles or IDs from upstream requirements.
   - `related_components`: List the exact component names or IDs from upstream architecture.
5. Success criteria must be concrete, observable, measurable engineering milestones (e.g. "Sensor streams JSON payload over MQTT at 10Hz without drops", "P99 latency remains below 100ms").

Order work according to technical dependencies. Every task that relies on another task (e.g. implementation relying on interface definition, or verification relying on hardware assembly) MUST list those predecessor task IDs in its `dependencies` array.

Ensure strict logical consistency across the plan:
- Never state or imply in planning_notes or task descriptions that tasks can run in parallel if one explicitly or transitively depends on another.
- Ensure critical_path represents the longest sequential chain of dependent tasks.

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
      "title": "Clear engineering action title with specific technical domain item",
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
    cleaned = cleaned.strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


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
    for idx, milestone in enumerate(payload.get("milestones", []), start=1):
        if not isinstance(milestone.get("order"), int):
            try:
                milestone["order"] = int(milestone.get("order", idx))
            except (ValueError, TypeError):
                milestone["order"] = idx
        if milestone.get("order", 0) < 1:
            milestone["order"] = idx
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

    # Break any direct or indirect cycles in dependencies
    dep_map = {t.id: list(t.dependencies) for t in plan.tasks}
    visited = set()
    recursion_stack = set()

    def has_cycle(u: str) -> bool:
        visited.add(u)
        recursion_stack.add(u)
        for v in list(dep_map.get(u, [])):
            if v not in visited:
                if has_cycle(v):
                    return True
            elif v in recursion_stack:
                dep_map[u].remove(v)
                return True
        recursion_stack.remove(u)
        return False

    for task in plan.tasks:
        if task.id not in visited:
            has_cycle(task.id)

    for task in plan.tasks:
        task.dependencies = dep_map.get(task.id, [])

    plan.critical_path = [cp for cp in plan.critical_path if cp in task_ids]

    # Build transitive closure of dependencies to detect contradictions in planning notes
    transitive_deps: dict[str, set[str]] = {t.id: set(t.dependencies) for t in plan.tasks}
    changed = True
    while changed:
        changed = False
        for tid, deps in transitive_deps.items():
            new_deps = deps.copy()
            for dep in deps:
                new_deps.update(transitive_deps.get(dep, set()))
            if new_deps != deps:
                transitive_deps[tid] = new_deps
                changed = True

    cleaned_notes = []
    for note in plan.planning_notes:
        note_lower = note.lower()
        if "parallel" in note_lower or "concurrent" in note_lower:
            contradiction = False
            for t1, t1_deps in transitive_deps.items():
                for t2 in t1_deps:
                    if (t1.lower() in note_lower or t1.replace("-", " ").lower() in note_lower) and \
                       (t2.lower() in note_lower or t2.replace("-", " ").lower() in note_lower):
                        contradiction = True
                        break
                if contradiction:
                    break
            if contradiction:
                continue
        cleaned_notes.append(note)
    plan.planning_notes = cleaned_notes

    return plan


class PlannerAgent:
    provider: str = "Nebius Token Factory"

    @property
    def model(self) -> str:
        return nebius_client.model

    def analyze(
        self,
        project: ProjectContext,
        requirements: RequirementAnalysis,
        architecture: ArchitectureAnalysis,
        existing_plan: ExecutionPlan | None = None,
        reviewer_findings: list[dict[str, Any]] | None = None,
        issue_context: dict[str, Any] | None = None,
        memory_context: str | None = None,
    ) -> tuple[ExecutionPlan, int]:
        payload: dict[str, Any] = {
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
        }

        if existing_plan and issue_context:
            payload["existing_plan"] = existing_plan.model_dump()
            payload["issue_recovery_context"] = issue_context
            payload["correction_instructions"] = (
                f"ISSUE RECOVERY MODE: An engineering issue occurred: {issue_context.get('description', '')}. "
                f"Root causes: {issue_context.get('likely_causes', [])}. "
                f"Recommended fix: {issue_context.get('recommended_fix', [])}. "
                "Update the execution plan to incorporate required recovery tasks, correct scheduling/dependencies, and resolve the issue. "
                "CRITICAL RULES: "
                "1. Preserve all existing valid tasks, milestones, and dependencies. "
                "2. Preserve existing task IDs (e.g., 'task-1') and milestone IDs. "
                "3. Only add new task IDs if genuinely introducing new recovery tasks. "
                "4. Ensure success criteria address the reported failure."
            )
        elif existing_plan and reviewer_findings:
            payload["existing_plan"] = existing_plan.model_dump()
            payload["reviewer_findings_to_correct"] = reviewer_findings
            payload["correction_instructions"] = (
                "CORRECTION MODE: The Reviewer Agent identified the planning/task issues listed above. "
                "Update the existing execution plan to thoroughly resolve each identified finding. "
                "CRITICAL RULES: "
                "1. Preserve all existing valid tasks, milestones, and dependencies. "
                "2. Preserve existing task IDs (e.g. 'task-1') and milestone IDs. "
                "3. Only add new task IDs if genuinely introducing new tasks. "
                "4. Incorporate explicit mitigation tasks, dependencies, or criteria for the identified risks."
            )

        prompt = json.dumps(payload, ensure_ascii=True)
        if memory_context:
            from app.services.memory_service import memory_service
            mem_text = memory_service.format_memory_for_prompt(memory_context)
            if mem_text:
                prompt = f"{prompt}\n\n{mem_text}"

        started = time.perf_counter()
        response = nebius_client.generate(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            enable_thinking=False,
            max_tokens=10000,
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
                    "Ensure no contradictory planning notes claim dependent tasks run in parallel.\n"
                    "No markdown or code fences.\n\n"
                    f"Previous response:\n{response.content}"
                )
                response = nebius_client.generate(
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": repair_prompt},
                    ],
                    response_format={"type": "json_object"},
                    enable_thinking=False,
                    max_tokens=10000,
                )
                plan = self._parse(response, "retry")
        else:
            repair_prompt = (
                "Your previous response was not valid JSON.\n"
                "Return the same execution plan data as exactly one valid JSON object matching the required schema.\n"
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
                max_tokens=10000,
            )
            plan = self._parse(response, "retry")

        if plan is None:
            raise RuntimeError("INVALID_AI_RESPONSE: Failed to parse execution plan")

        # Sanitize any remaining orphaned references safely
        plan = _sanitize_relationships(plan)

        # Quality Guard Check & at most ONE corrective regeneration pass
        issues = quality_guard.validate_plan(plan)
        if issues:
            correction_prompt = quality_guard.build_correction_prompt("Planner Agent", issues, response.content)
            corr_response = nebius_client.generate(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": response.content},
                    {"role": "user", "content": correction_prompt},
                ],
                response_format={"type": "json_object"},
                enable_thinking=False,
                max_tokens=10000,
            )
            corr_plan = self._parse(corr_response, "correction")
            if corr_plan is not None:
                corr_plan = _sanitize_relationships(corr_plan)
                remaining_issues = quality_guard.validate_plan(corr_plan)
                if remaining_issues:
                    print(f"[Quality Guard Warning] Planner Agent retained generic tasks after correction: {remaining_issues}")
                plan = corr_plan

        duration_ms = round((time.perf_counter() - started) * 1000)
        return plan, duration_ms

    def _parse(self, response: NebiusResponse, attempt: str) -> ExecutionPlan | None:
        debug = os.getenv("NEBIUS_DEBUG_RESPONSES", os.getenv("NEMOTRON_DEBUG_RESPONSES", "0")) == "1"
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
