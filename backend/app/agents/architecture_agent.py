import json
import os
import time

from pydantic import ValidationError

from app.ai.nebius_client import NebiusResponse, nebius_client
from app.schemas import ArchitectureAnalysis, ProjectContext, RequirementAnalysis

SYSTEM_PROMPT = """You are the Architecture Agent inside ProjectPilot AI.

Your responsibility is to transform validated engineering requirements into a feasible system architecture. You are not a general chatbot. Design only what is justified by the supplied project and requirements.

Identify system components, component responsibilities, connections, interfaces, data flow, technology assignments, architecture decisions, and architecture gaps. Every major architectural decision should be traceable to the requirements. Do not invent unsupported technologies merely to make the architecture look sophisticated. If an important architectural decision cannot yet be made, represent it as an architecture gap.

To optimize processing, you MUST strictly adhere to the following limits:
- Keep all descriptions, responsibilities, reasons, and data flow steps extremely concise
- Do not provide long explanations or justifications outside the JSON
- Limit data_flow to a maximum of 6 critical steps
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
  "summary": "Architecture summary",
  "components": [{"id":"component-1","name":"...","type":"hardware|software|cloud|interface|service|other","responsibility":"...","technology":"...","inputs":["..."],"outputs":["..."],"related_requirements":["requirement title"]}],
  "connections": [{"source":"component-1","target":"component-2","interface":"...","protocol":"...","data":"...","description":"..."}],
  "data_flow": [{"step":1,"description":"..."}],
  "architecture_decisions": [{"decision":"...","reason":"..."}],
  "architecture_gaps": [{"title":"...","severity":"critical|high|medium|low","reason":"...","recommended_action":"..."}]
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

    def analyze(self, project: ProjectContext, requirements: RequirementAnalysis) -> tuple[ArchitectureAnalysis, int]:
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
            },
            ensure_ascii=True,
        )
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
