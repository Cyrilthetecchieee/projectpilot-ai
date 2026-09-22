with open("backend/app/schemas.py", "r", encoding="utf-8") as f:
    content = f.read()

orchestrator_schemas = """
# ---------------------------------------------------------------------------
# Orchestrator schemas
# ---------------------------------------------------------------------------

from enum import Enum

class OrchestratorState(str, Enum):
    INITIALIZED = "INITIALIZED"
    REQUIREMENTS_PENDING = "REQUIREMENTS_PENDING"
    REQUIREMENTS_COMPLETE = "REQUIREMENTS_COMPLETE"
    ARCHITECTURE_PENDING = "ARCHITECTURE_PENDING"
    ARCHITECTURE_COMPLETE = "ARCHITECTURE_COMPLETE"
    PLANNING_PENDING = "PLANNING_PENDING"
    PLANNING_COMPLETE = "PLANNING_COMPLETE"
    REVIEW_PENDING = "REVIEW_PENDING"
    REVIEW_COMPLETE = "REVIEW_COMPLETE"
    TESTING_PENDING = "TESTING_PENDING"
    TESTING_COMPLETE = "TESTING_COMPLETE"
    READY = "READY"
    PAUSED = "PAUSED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"

class DecisionRecord(BaseModel):
    id: str
    timestamp: str
    previous_state: str
    next_state: str
    action: str
    agent: str
    reason: str
    result: str = ""
    retry_count: int = 0

class OrchestratorRun(BaseModel):
    project_id: str
    state: OrchestratorState
    current_agent: str = ""
    current_action: str = ""
    progress_steps: list[str] = Field(default_factory=list)
    decisions: list[DecisionRecord] = Field(default_factory=list)
    execution_count: int = 0
    correction_cycles: int = 0
    is_running: bool = False
    human_input_required: bool = False
    human_input_reason: str = ""
    error_message: str = ""
"""
if "OrchestratorState" not in content:
    content += "\n" + orchestrator_schemas

with open("backend/app/schemas.py", "w", encoding="utf-8") as f:
    f.write(content)
