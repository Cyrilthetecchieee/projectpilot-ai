import json
import re
import time
from typing import Any

from app.ai.nebius_client import nebius_client
from app.ai.quality_guard import quality_guard
from app.schemas import (
    ArchitectureAnalysis,
    ExecutionPlan,
    ProjectContext,
    RequirementAnalysis,
    ReviewAnalysis,
    TestAnalysis,
)

SYSTEM_PROMPT = """You are the Test Agent inside ProjectPilot AI.

Your responsibility is to generate a practical, highly project-specific engineering verification strategy based on the supplied requirements, architecture, execution plan, and reviewer risks.

CRITICAL TEST SPECIFICITY GUIDELINES:
1. Every test scenario must verify an actual domain workflow, edge case, hardware interface, or failure recovery mode grounded in THIS project.
2. Avoid generic test scenarios such as:
   - "Valid primary workflow"
   - "Missing required input"
   - "Integration loss"
   - "Basic test"
   - "Error test"
   - "System test"
   Instead, state concrete scenarios such as: "Verify ESP32 telemetry recovery and backoff retry after Wi-Fi interruption" or "Verify composite thermal barrier maintains integrity under 800°C for 10 minutes".
3. Tests must explicitly reference:
   - Specific component names from architecture
   - Concrete requirement titles/targets
   - Protocols, interfaces, and payloads
   - Specific failure modes and reviewer risks
4. Preconditions and expected results must specify exact physical or software states, inputs, and measurable acceptance criteria.

To optimize processing, you MUST strictly adhere to the following limits:
- Keep all descriptions concise and directly to the point
- Limit test cases to between 4 and 8
- Do not provide long explanations or markdown text outside the JSON

Return exactly ONE valid JSON object.
Do not include markdown.
Do not include ```json fences.
Do not include explanations before the JSON.
Do not include explanations after the JSON.
The first character of your final answer must be { and the last character must be }.

Use exactly this JSON shape:
{
  "summary": "Clear summary of the verification strategy targeting critical project constraints and risks",
  "test_cases": [
    {
      "scenario": "Concrete test scenario describing the specific subsystem behavior or failure mode",
      "precondition": "Initial state with specific components, connections, and configuration",
      "expected_result": "Measurable, observable outcome including tolerances or status codes"
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
        issue_context: dict | None = None,
        memory_context: str | None = None,
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
        if issue_context:
            prompt_parts.append(
                f"TARGETED ISSUE RECOVERY VERIFICATION:\n"
                f"An engineering issue was resolved and requires targeted verification tests.\n"
                f"Issue Description: {issue_context.get('description', '')}\n"
                f"Likely Root Causes: {issue_context.get('likely_causes', [])}\n"
                f"Recommended Fix: {issue_context.get('recommended_fix', [])}\n"
                f"Generate explicit verification scenarios that validate the fix, test edge cases, and confirm the issue cannot recur.\n"
            )
        if memory_context:
            from app.services.memory_service import memory_service
            mem_text = memory_service.format_memory_for_prompt(memory_context)
            if mem_text:
                prompt_parts.append(mem_text)

        prompt = "\n".join(prompt_parts)
        started = time.perf_counter()
        raw = nebius_client.complete_json(SYSTEM_PROMPT, prompt)
        try:
            parsed = json.loads(_strip_json_fence(raw))
            if isinstance(parsed, list):
                parsed = {"summary": "Verification strategy and test suite", "test_cases": parsed}
            elif isinstance(parsed, dict):
                if "test_cases" not in parsed:
                    if "title" in parsed or "steps" in parsed or "task_id" in parsed:
                        parsed = {"summary": parsed.get("title", "Verification test scenario"), "test_cases": [parsed]}
                    else:
                        parsed = {"summary": parsed.get("summary", "Verification strategy"), "test_cases": []}
                elif "summary" not in parsed or not parsed["summary"]:
                    parsed["summary"] = "Verification strategy and test suite"
            result = TestAnalysis.model_validate(parsed)
        except (json.JSONDecodeError, ValueError) as error:
            raise RuntimeError("Test Agent returned invalid structured JSON") from error

        # Quality Guard Check & at most ONE corrective regeneration pass
        issues = quality_guard.validate_test(result)
        if issues:
            correction_prompt = quality_guard.build_correction_prompt("Test Agent", issues, raw)
            corr_raw = nebius_client.complete_json(SYSTEM_PROMPT, f"{prompt}\n\n{correction_prompt}")
            try:
                corr_parsed = json.loads(_strip_json_fence(corr_raw))
                if isinstance(corr_parsed, list):
                    corr_parsed = {"summary": "Verification strategy and test suite", "test_cases": corr_parsed}
                elif isinstance(corr_parsed, dict):
                    if "test_cases" not in corr_parsed:
                        if "title" in corr_parsed or "steps" in corr_parsed or "task_id" in corr_parsed:
                            corr_parsed = {"summary": corr_parsed.get("title", "Verification test scenario"), "test_cases": [corr_parsed]}
                        else:
                            corr_parsed = {"summary": corr_parsed.get("summary", "Verification strategy"), "test_cases": []}
                    elif "summary" not in corr_parsed or not corr_parsed["summary"]:
                        corr_parsed["summary"] = "Verification strategy and test suite"
                corr_result = TestAnalysis.model_validate(corr_parsed)
                remaining_issues = quality_guard.validate_test(corr_result)
                if remaining_issues:
                    print(f"[Quality Guard Warning] Test Agent retained generic scenarios after correction: {remaining_issues}")
                result = corr_result
            except (json.JSONDecodeError, ValueError):
                pass

        return result, round((time.perf_counter() - started) * 1000)


test_agent = TestAgent()
