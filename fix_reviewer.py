import re

with open('backend/app/agents/reviewer_agent.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("from app.schemas import ProjectContext, RequirementAnalysis, ArchitectureAnalysis, ReviewAnalysis", 
"from app.schemas import ProjectContext, RequirementAnalysis, ArchitectureAnalysis, ReviewAnalysis, ExecutionPlan, PlannerTask, IssueAnalysisResponse")
content = content.replace("import json", "import json\nimport base64")

issue_logic = """
    def analyze_issue(self, project: ProjectContext, requirements: RequirementAnalysis, architecture: ArchitectureAnalysis, plan: ExecutionPlan, task: PlannerTask, description: str, image_bytes: bytes | None) -> tuple[IssueAnalysisResponse, int]:
        system_prompt = \"\"\"You are the Reviewer Agent inside ProjectPilot AI.
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
\"\"\"
        user_prompt = (
            f"Project Objective: {project.objective}\\n"
            f"Requirements:\\n{requirements.model_dump_json(indent=2)}\\n"
            f"Architecture:\\n{architecture.model_dump_json(indent=2)}\\n"
            f"Current Task:\\n{task.model_dump_json(indent=2)}\\n"
            f"User Issue Description: {description}\\n"
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
            response = nvidia_client.generate(messages, response_format={"type": "json_object"})
            content = response.content
        else:
            content = nvidia_client.complete_json(system_prompt, user_prompt)
            
        duration_ms = (time.time_ms() if hasattr(time, "time_ms") else int(time.time() * 1000)) - start_ms

        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        try:
            parsed = json.loads(content)
            analysis = IssueAnalysisResponse(**parsed)
            return analysis, duration_ms
        except (json.JSONDecodeError, ValidationError) as e:
            raise ValueError(f"ReviewerAgent returned invalid JSON or failed schema validation: {e}\\n\\nContent:\\n{content}")
"""

content = content.replace("reviewer_agent = ReviewerAgent()", issue_logic + "\nreviewer_agent = ReviewerAgent()")

with open('backend/app/agents/reviewer_agent.py', 'w', encoding='utf-8') as f:
    f.write(content)
