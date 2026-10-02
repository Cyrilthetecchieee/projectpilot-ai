import json
import os
import time
from typing import Any

from pydantic import ValidationError

from app.ai.nebius_client import NebiusResponse, nebius_client
from app.ai.quality_guard import quality_guard
from app.schemas import ArchitectureAnalysis, ProjectContext, RequirementAnalysis

SYSTEM_PROMPT = """You are the Architecture Agent inside ProjectPilot AI.

Your responsibility is to transform validated engineering requirements into a feasible, project-specific system architecture. You are not a general chatbot. Design only what is justified by the supplied project and requirements.

CRITICAL ARCHITECTURE GUIDELINES:
1. Component Naming: Derive REAL, project-specific component names directly from the project's requirements, technologies, hardware, and domain.
   Do NOT generate generic placeholder component names such as:
   - "Input & Interface"
   - "Core Processing"
   - "Persistence Layer"
   - "External Integration"
   - "Output Layer"
   - "Storage Layer"
   Instead, name the actual domain subsystems (e.g., if the project involves microcontrollers, sensors, Firebase, and React, name components like "ESP32 Sensor Telemetry Node", "Payload Processing Service", "Firebase Realtime Datastore", "Operator React Dashboard", "Motor Actuator Subsystem").

2. Component Details:
   - Each component must explain its concrete responsibility in THIS project (do NOT say "Owns core processing for the project").
   - Explicitly define inputs, outputs, technology/hardware, and related requirement titles.

3. Connections:
   - When 2 or more components exist, you MUST provide explicit connections between them (connections == 0 is incomplete).
   - Describe real interfaces, communication protocols (e.g. SPI, I2C, MQTT over Wi-Fi, HTTPS REST, WebSocket), and specific data payloads.

4. Data Flow:
   - Provide concrete, step-by-step end-to-end data flow describing how information, physical material, or control signals travel from inception to completion (data_flow_steps == 0 is incomplete).

To optimize processing, you MUST strictly adhere to the following limits:
- Keep all descriptions, responsibilities, reasons, and data flow steps concise
- Do not provide long explanations or justifications outside the JSON
- Limit data_flow to between 3 and 6 critical steps
- Limit architecture_decisions to a maximum of 4
- Limit architecture_gaps to a maximum of 3

Return exactly ONE valid JSON object.
Do not include markdown.
Do not include ```json fences.
Do not include explanations before the JSON.
Do not include explanations after the JSON.
The first character of your final answer must be { and the last character must be }.
Follow the supplied schema exactly.

Use exactly this JSON shape:
{
  "summary": "Architecture summary describing the specific system topology",
  "components": [{"id":"component-1","name":"Real Component Name","type":"hardware|software|cloud|interface|service|other","responsibility":"Concrete technical responsibility in this project","technology":"Specific tech/hardware","inputs":["input 1"],"outputs":["output 1"],"related_requirements":["requirement title"]}],
  "connections": [{"source":"component-1","target":"component-2","interface":"Specific Interface","protocol":"Protocol (e.g. MQTT/HTTPS/I2C)","data":"Data payload description","description":"How data flows"}],
  "data_flow": [{"step":1,"description":"Concrete end-to-end workflow step"}],
  "architecture_decisions": [{"decision":"Architecture decision","reason":"Technical justification"}],
  "architecture_gaps": [{"title":"Specific gap","severity":"critical|high|medium|low","reason":"Technical risk","recommended_action":"Concrete action"}]
}
"""


def _parse_final_content(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```json") and cleaned.endswith("```"):
        return cleaned[len("```json"):-len("```")].strip()
    if cleaned.startswith("```") and cleaned.endswith("```"):
        return cleaned[len("```"):-len("```")].strip()
    return cleaned


def _normalize_component_types(payload: dict) -> dict:
    allowed = {"hardware", "software", "cloud", "interface", "service", "other"}
    for component in payload.get("components", []):
        component_type = str(component.get("type", "other")).lower()
        if component_type not in allowed:
            component["type"] = "hardware" if component_type in {"mcu", "sensor", "device", "controller"} else "other"
    return payload


class ArchitectureAgent:
    provider: str = "Nebius Token Factory"

    @property
    def model(self) -> str:
        return nebius_client.model

    def analyze(
        self,
        project: ProjectContext,
        requirements: RequirementAnalysis,
        existing_architecture: ArchitectureAnalysis | None = None,
        reviewer_findings: list[dict[str, Any]] | None = None,
        issue_context: dict[str, Any] | None = None,
        memory_context: str | None = None,
    ) -> tuple[ArchitectureAnalysis, int]:
        payload: dict[str, Any] = {
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
        }
        if existing_architecture and issue_context:
            payload["existing_architecture"] = existing_architecture.model_dump()
            payload["issue_recovery_context"] = issue_context
            payload["correction_instructions"] = (
                f"ISSUE RECOVERY MODE: An engineering issue was diagnosed: {issue_context.get('description', '')}. "
                f"Root causes: {issue_context.get('likely_causes', [])}. "
                f"Recommended fix: {issue_context.get('recommended_fix', [])}. "
                "Update the architecture to resolve and mitigate this issue. "
                "CRITICAL RULES: "
                "1. Preserve all existing unaffected components, connections, and decisions. "
                "2. Preserve existing component IDs (e.g., 'component-1') for all retained or updated components. "
                "3. Only assign new IDs if introducing genuinely new components. "
                "4. Incorporate concrete mitigation architecture for the reported issue."
            )
        elif existing_architecture and reviewer_findings:
            payload["existing_architecture"] = existing_architecture.model_dump()
            payload["reviewer_findings_to_correct"] = reviewer_findings
            payload["correction_instructions"] = (
                "CORRECTION MODE: The Reviewer Agent identified the critical engineering issues listed above. "
                "Update the existing architecture to thoroughly resolve and mitigate each identified finding. "
                "CRITICAL RULES: "
                "1. Preserve all existing unaffected components, connections, and decisions. "
                "2. Preserve existing component IDs (e.g., 'component-1') for all retained or updated components. "
                "3. Only assign new IDs if introducing genuinely new components. "
                "4. Incorporate concrete mitigation architectures for each reviewer risk."
            )
        prompt = json.dumps(payload, ensure_ascii=True)
        if memory_context:
            from app.services.memory_service import memory_service
            mem_text = memory_service.format_memory_for_prompt(memory_context)
            if mem_text:
                prompt = f"{prompt}\n\n{mem_text}"

        started = time.perf_counter()
        response = nebius_client.generate(
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            enable_thinking=False,
            max_tokens=6000,
        )
        result = self._parse(response, "first")
        if result is None:
            repair_prompt = (
                "Your previous response was not valid JSON.\n"
                "Return the same architecture data as exactly one valid JSON object matching the required schema.\n"
                "No markdown or explanatory text.\n\n"
                f"Previous response:\n{response.content}"
            )
            response = nebius_client.generate(
                messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": repair_prompt}],
                response_format={"type": "json_object"},
                enable_thinking=False,
                max_tokens=6000,
            )
            result = self._parse(response, "retry")
        if result is None:
            raise RuntimeError("INVALID_AI_RESPONSE")

        # Quality Guard Check & at most ONE corrective regeneration pass
        issues = quality_guard.validate_architecture(result)
        if issues:
            correction_prompt = quality_guard.build_correction_prompt("Architecture Agent", issues, response.content)
            corr_response = nebius_client.generate(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": response.content},
                    {"role": "user", "content": correction_prompt},
                ],
                response_format={"type": "json_object"},
                enable_thinking=False,
                max_tokens=6000,
            )
            corr_result = self._parse(corr_response, "correction")
            if corr_result is not None:
                remaining_issues = quality_guard.validate_architecture(corr_result)
                if remaining_issues:
                    print(f"[Quality Guard Warning] Architecture Agent retained issues after correction: {remaining_issues}")
                result = corr_result

        return result, round((time.perf_counter() - started) * 1000)

    def _parse(self, response: NebiusResponse, attempt: str) -> ArchitectureAnalysis | None:
        debug = os.getenv("NEBIUS_DEBUG_RESPONSES", os.getenv("NEMOTRON_DEBUG_RESPONSES", "0")) == "1"
        if debug:
            print(f"Architecture Agent {attempt} finish_reason={response.finish_reason} content_length={len(response.content)}")
            print("RAW CONTENT START")
            print(response.content.encode("ascii", "backslashreplace").decode("ascii"))
            print("RAW CONTENT END")
            print(f"reasoning_content_present={bool(response.reasoning_content)}")
        try:
            parsed = json.loads(_parse_final_content(response.content))
            return ArchitectureAnalysis.model_validate(_normalize_component_types(parsed))
        except (json.JSONDecodeError, ValidationError) as error:
            if debug:
                print(f"Architecture Agent {attempt} parse failed: {type(error).__name__}")
            return None


architecture_agent = ArchitectureAgent()
