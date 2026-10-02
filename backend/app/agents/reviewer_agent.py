import json
import base64
import time
from typing import Any

from pydantic import ValidationError

from app.ai.nebius_client import NebiusResponse, nebius_client
from app.ai.quality_guard import quality_guard
from app.schemas import ProjectContext, RequirementAnalysis, ArchitectureAnalysis, ReviewAnalysis, ExecutionPlan, PlannerTask, IssueAnalysisResponse

SYSTEM_PROMPT = """You are the Reviewer Agent inside ProjectPilot AI.

Your responsibility is to review a project's context, requirements, architecture, and execution plan to identify concrete engineering risks, gaps, inconsistencies, and unhandled failure modes. You are not a general chatbot. Review only what is justified by the supplied context.

CRITICAL REVIEW GUIDELINES:
1. Ground every finding in specific project evidence. Findings must reference actual requirement titles, architecture components, plan tasks, technologies, protocols, hardware interfaces, or physical constraints.
2. Avoid vague, generic findings such as:
   - "Failure behavior needs an explicit decision"
   - "Integration boundary is not finalized"
   - "Missing documentation"
   - "Error handling needed"
   Instead, state specific findings like: "The ESP32-to-Firebase telemetry interface does not define retry buffering during Wi-Fi connection loss, risking sensor data drops."
3. Each risk must clearly explain:
   - WHAT is technically flawed or unaddressed
   - WHERE it occurs (naming specific components, requirements, or interfaces)
   - WHY it matters (concrete engineering consequence: data loss, physical damage, race condition, SLA violation)
   - WHAT should be done (concrete technical mitigation)

To optimize processing, you MUST strictly adhere to the following limits:
- Keep all descriptions, details, and recommendations concise
- Do not provide long explanations or justifications outside the JSON
- Limit risks to a maximum of 5

Return exactly ONE valid JSON object.
Do not include markdown.
Do not include ```json fences.
Do not include explanations before the JSON.
Do not include explanations after the JSON.
The first character of your final answer must be { and the last character must be }.
Follow the supplied schema exactly.

Use exactly this JSON shape:
{
  "summary": "Review summary identifying key technical risks and gaps",
  "risks": [
    {
      "title": "Specific risk title referencing component or technology",
      "severity": "critical|high|medium|low",
      "detail": "WHAT is wrong, WHERE it occurs, and WHY it matters in this project",
      "recommendation": "Concrete technical mitigation"
    }
  ]
}
"""

class ReviewerAgent:
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
        memory_context: str | None = None,
    ) -> tuple[ReviewAnalysis, int]:
        prompt_parts = [
            f"Project Name: {project.name}",
            f"Type: {project.type}",
            f"Objective: {project.objective}\n",
            f"Requirements:\n{requirements.model_dump_json(indent=2)}\n",
            f"Architecture:\n{architecture.model_dump_json(indent=2)}\n",
        ]
        if plan:
            prompt_parts.append(f"Execution Plan:\n{plan.model_dump_json(indent=2)}\n")

        if memory_context:
            from app.services.memory_service import memory_service
            mem_text = memory_service.format_memory_for_prompt(memory_context)
            if mem_text:
                prompt_parts.append(mem_text)

        prompt = "\n".join(prompt_parts)
        
        start_ms = time.time_ms() if hasattr(time, "time_ms") else int(time.time() * 1000)
        content = nebius_client.complete_json(SYSTEM_PROMPT, prompt)
        duration_ms = (time.time_ms() if hasattr(time, "time_ms") else int(time.time() * 1000)) - start_ms

        content = self._clean_content(content)

        try:
            analysis = self._parse_json(content)
        except (json.JSONDecodeError, ValidationError) as e:
            raise ValueError(f"ReviewerAgent returned invalid JSON or failed schema validation: {e}\n\nContent:\n{content}")

        # Quality Guard Check & at most ONE corrective regeneration pass
        issues = quality_guard.validate_review(analysis)
        if issues:
            correction_prompt = quality_guard.build_correction_prompt("Reviewer Agent", issues, content)
            combined_prompt = f"{prompt}\n\n{correction_prompt}"
            corr_content = nebius_client.complete_json(SYSTEM_PROMPT, combined_prompt)
            corr_content = self._clean_content(corr_content)
            try:
                corr_analysis = self._parse_json(corr_content)
                remaining_issues = quality_guard.validate_review(corr_analysis)
                if remaining_issues:
                    print(f"[Quality Guard Warning] Reviewer Agent retained generic elements after correction: {remaining_issues}")
                analysis = corr_analysis
            except (json.JSONDecodeError, ValidationError):
                pass

        return analysis, duration_ms

    def _clean_content(self, content: str) -> str:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            content = content[start : end + 1]
        return content

    def _parse_json(self, content: str) -> ReviewAnalysis:
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            parsed = {"summary": "System review completed.", "risks": []}
        if "summary" not in parsed or not parsed["summary"]:
            parsed["summary"] = "Review of architecture and execution plan completed."
        if "risks" not in parsed or not isinstance(parsed["risks"], list):
            parsed["risks"] = []
        valid_severities = {"critical", "high", "medium", "low"}
        for risk in parsed.get("risks", []):
            sev = str(risk.get("severity", "medium")).lower()
            risk["severity"] = sev if sev in valid_severities else "medium"
        return ReviewAnalysis(**parsed)


    def analyze_issue(self, project: ProjectContext, requirements: RequirementAnalysis, architecture: ArchitectureAnalysis, plan: ExecutionPlan, task: PlannerTask, description: str, image_bytes: bytes | None) -> tuple[IssueAnalysisResponse, int]:
        system_prompt = """You are the Reviewer Agent inside ProjectPilot AI.
Your responsibility is to diagnose execution issues reported by users on specific tasks.
Analyze the provided project context, requirements, architecture, execution plan, task details, user's issue description, and an optional image.
Provide a structured diagnosis and recovery plan.
Return exactly ONE valid JSON object. Do not include markdown.

Use exactly this JSON shape:
{
  "issue_summary": "Short summary",
  "severity": "critical|high|medium|low",
  "likely_causes": ["Cause 1", "Cause 2"],
  "recommended_fix": ["Step 1", "Step 2"],
  "affected_requirements": ["FR-01"],
  "affected_components": ["ac-01"],
  "blocked_tasks": ["task-02"],
  "can_continue_other_tasks": true,
  "recommended_next_action": "Do this next",
  "recovery_task": {
    "needed": true,
    "title": "Fix something",
    "description": "Details",
    "estimated_effort": "1h"
  }
}
"""
        user_prompt = (
            f"Project Objective: {project.objective}\n"
            f"Requirements:\n{requirements.model_dump_json(indent=2)}\n"
            f"Architecture:\n{architecture.model_dump_json(indent=2)}\n"
            f"Current Task:\n{task.model_dump_json(indent=2)}\n"
            f"User Issue Description: {description}\n"
        )

        start_ms = time.time_ms() if hasattr(time, "time_ms") else int(time.time() * 1000)
        
        if image_bytes:
            b64_image = base64.b64encode(image_bytes).decode('utf-8')
            messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                    ]
                }
            ]
            response = nebius_client.generate(messages, response_format={"type": "json_object"})
            content = response.content
        else:
            content = nebius_client.complete_json(system_prompt, user_prompt)
            
        duration_ms = (time.time_ms() if hasattr(time, "time_ms") else int(time.time() * 1000)) - start_ms

        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            content = content[start : end + 1]

        try:
            parsed = json.loads(content)
            valid_severities = {"critical", "high", "medium", "low"}
            sev = str(parsed.get("severity", "medium")).lower()
            parsed["severity"] = sev if sev in valid_severities else "medium"
            analysis = IssueAnalysisResponse(**parsed)
            return analysis, duration_ms
        except (json.JSONDecodeError, ValidationError) as e:
            raise ValueError(f"ReviewerAgent returned invalid JSON or failed schema validation: {e}\n\nContent:\n{content}")

reviewer_agent = ReviewerAgent()

