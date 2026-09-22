from typing import Literal

from pydantic import BaseModel, Field
from pydantic import BaseModel, Field, model_validator

Priority = Literal["critical", "high", "medium", "low"]


class ProjectContext(BaseModel):
    id: str
    name: str
    idea: str = ""
    objective: str = ""
    type: str = ""
    technologies: list[str] = Field(default_factory=list)
    constraints: str = ""
    timeline: str = ""
    stage: str = ""


class RequirementItem(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: Priority


class RequirementAnalysis(BaseModel):
    problem: str = Field(min_length=1)
    functional_requirements: list[RequirementItem] = Field(default_factory=list)
    non_functional_requirements: list[RequirementItem] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class RequirementsRequest(BaseModel):
    project: ProjectContext


class RequirementsResponse(RequirementAnalysis):
    project_id: str
    agent: str = "Requirement Agent"
    provider: str = "NVIDIA"
    model: str
    duration_ms: int
    summary: str


ArchitectureType = Literal["hardware", "software", "cloud", "interface", "service", "other"]


class ArchitectureComponent(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    type: ArchitectureType
    responsibility: str = Field(min_length=1)
    technology: str = ""
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    related_requirements: list[str] = Field(default_factory=list)


class ArchitectureConnection(BaseModel):
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)
    interface: str = ""
    protocol: str = ""
    data: str = ""
    description: str = Field(min_length=1)


class DataFlowStep(BaseModel):
    step: int = Field(ge=1)
    description: str = Field(min_length=1)


class ArchitectureDecision(BaseModel):
    decision: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class ArchitectureGap(BaseModel):
    title: str = Field(min_length=1)
    severity: Priority
    reason: str = Field(min_length=1)
    recommended_action: str = Field(min_length=1)


class ArchitectureAnalysis(BaseModel):
    summary: str = Field(min_length=1)
    components: list[ArchitectureComponent] = Field(min_length=1)
    connections: list[ArchitectureConnection] = Field(default_factory=list)
    data_flow: list[DataFlowStep] = Field(default_factory=list)
    architecture_decisions: list[ArchitectureDecision] = Field(default_factory=list)
    architecture_gaps: list[ArchitectureGap] = Field(default_factory=list)


class ArchitectureRequest(BaseModel):
    project: ProjectContext


class ArchitectureResponse(ArchitectureAnalysis):
    project_id: str
    agent: str = "Architecture Agent"
    provider: str = "NVIDIA"
    model: str
    duration_ms: int


<<<<<<< HEAD
TaskStatus = Literal["todo", "in_progress", "completed"]
=======
# ---------------------------------------------------------------------------
# Planner Agent schemas
# ---------------------------------------------------------------------------

PlannerTaskStatus = Literal["todo", "in_progress", "completed"]
>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3


class Milestone(BaseModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
<<<<<<< HEAD
    description: str = Field(default="")
=======
    description: str = ""
>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3
    order: int = Field(ge=1)


class PlannerTask(BaseModel):
    id: str = Field(min_length=1)
    milestone_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
<<<<<<< HEAD
    description: str = Field(default="")
    priority: Priority = "medium"
    status: TaskStatus = "todo"
    estimated_effort: str = Field(default="2-4 hours")
=======
    description: str = ""
    priority: Priority
    status: PlannerTaskStatus = "todo"
    estimated_effort: str = ""
>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3
    dependencies: list[str] = Field(default_factory=list)
    related_requirements: list[str] = Field(default_factory=list)
    related_components: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)


class ExecutionPlan(BaseModel):
    summary: str = Field(min_length=1)
    milestones: list[Milestone] = Field(min_length=1)
    tasks: list[PlannerTask] = Field(min_length=1)
    critical_path: list[str] = Field(default_factory=list)
    planning_notes: list[str] = Field(default_factory=list)

<<<<<<< HEAD
=======
    @model_validator(mode="after")
    def validate_references(self) -> "ExecutionPlan":
        milestone_ids = {m.id for m in self.milestones}
        task_ids = {t.id for t in self.tasks}
        errors: list[str] = []
        for task in self.tasks:
            if task.milestone_id not in milestone_ids:
                errors.append(f"Task {task.id} references unknown milestone {task.milestone_id}")
            for dep in task.dependencies:
                if dep not in task_ids:
                    errors.append(f"Task {task.id} depends on unknown task {dep}")
        for cp in self.critical_path:
            if cp not in task_ids:
                errors.append(f"Critical path references unknown task {cp}")
        if errors:
            raise ValueError("Invalid execution plan references: " + "; ".join(errors))
        return self

>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3

class PlannerRequest(BaseModel):
    project: ProjectContext


<<<<<<< HEAD
class ExecutionPlanResponse(ExecutionPlan):
=======
class PlannerResponse(ExecutionPlan):
>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3
    project_id: str
    agent: str = "Planner Agent"
    provider: str = "NVIDIA"
    model: str
    duration_ms: int

<<<<<<< HEAD
=======

class ReviewRisk(BaseModel):
    title: str = Field(min_length=1)
    severity: Priority
    detail: str = Field(min_length=1)
    recommendation: str = Field(min_length=1)


class ReviewAnalysis(BaseModel):
    summary: str = Field(min_length=1)
    risks: list[ReviewRisk] = Field(default_factory=list)


class ReviewRequest(BaseModel):
    project: ProjectContext


class ReviewResponse(ReviewAnalysis):
    project_id: str
    agent: str = "Reviewer Agent"
    provider: str = "NVIDIA"
    model: str
    duration_ms: int

# ---------------------------------------------------------------------------
# Test Agent schemas
# ---------------------------------------------------------------------------

class TestCaseItem(BaseModel):
    scenario: str = Field(min_length=1)
    precondition: str = Field(min_length=1)
    expected_result: str = Field(min_length=1)

class TestAnalysis(BaseModel):
    summary: str = Field(min_length=1)
    test_cases: list[TestCaseItem] = Field(default_factory=list)

class TestRequest(BaseModel):
    project: ProjectContext

class TestResponse(TestAnalysis):
    project_id: str
    agent: str = "Test Agent"
    provider: str = "NVIDIA"
    model: str
    duration_ms: int


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
>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3
