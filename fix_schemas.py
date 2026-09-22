import re

with open('backend/app/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

issue_schemas = """
# ---------------------------------------------------------------------------
# Issue Analysis schemas
# ---------------------------------------------------------------------------

class RecoveryTaskOption(BaseModel):
    needed: bool
    title: str = ""
    description: str = ""
    estimated_effort: str = ""

class IssueAnalysisResponse(BaseModel):
    issue_summary: str = Field(min_length=1)
    severity: Priority
    likely_causes: list[str] = Field(min_length=1)
    recommended_fix: list[str] = Field(min_length=1)
    affected_requirements: list[str] = Field(default_factory=list)
    affected_components: list[str] = Field(default_factory=list)
    blocked_tasks: list[str] = Field(default_factory=list)
    can_continue_other_tasks: bool
    recommended_next_action: str = Field(min_length=1)
    recovery_task: RecoveryTaskOption

class IssueRecord(BaseModel):
    id: str
    project_id: str
    task_id: str
    description: str
    image_path: str = ""
    analysis: IssueAnalysisResponse
    status: str = "Open"
    created_at: str
    resolved_at: str = ""
"""
content += "\n" + issue_schemas

with open('backend/app/schemas.py', 'w', encoding='utf-8') as f:
    f.write(content)
