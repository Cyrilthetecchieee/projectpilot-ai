from typing import Any, Literal

from pydantic import BaseModel, Field

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
    provider: str = "Nebius Token Factory"
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
    provider: str = "Nebius Token Factory"
    model: str
    duration_ms: int


# ---------------------------------------------------------------------------
# Planner Agent schemas
# ---------------------------------------------------------------------------

TaskStatus = Literal["todo", "in_progress", "completed"]
PlannerTaskStatus = TaskStatus


class Milestone(BaseModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str = Field(default="")
    order: int = Field(ge=1)


class PlannerTask(BaseModel):
    id: str = Field(min_length=1)
    milestone_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str = Field(default="")
    priority: Priority = "medium"
    status: TaskStatus = "todo"
    estimated_effort: str = Field(default="2-4 hours")
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


class PlannerRequest(BaseModel):
    project: ProjectContext


class PlannerResponse(ExecutionPlan):
    project_id: str
    agent: str = "Planner Agent"
    provider: str = "Nebius Token Factory"
    model: str
    duration_ms: int


ExecutionPlanResponse = PlannerResponse


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
    provider: str = "Nebius Token Factory"
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
    provider: str = "Nebius Token Factory"
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
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"
    # Backwards compatibility
    INITIALIZED = "INITIALIZED"
    READY = "READY"
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
    BLOCKED = "BLOCKED"

class InvalidationRecord(BaseModel):
    timestamp: str
    trigger_stage: str
    invalidated_stages: list[str]
    reason: str


class HumanDecisionPrompt(BaseModel):
    question: str
    affected_stage: str
    evidence: str
    mitigation: str = ""


class HumanDecisionInput(BaseModel):
    decision: str


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


class RecoveryRecord(BaseModel):
    id: str
    issue_id: str
    timestamp: str
    classification: str
    target: str
    summary: str
    actions_taken: list[str] = Field(default_factory=list)
    result: str = ""


class ManualInterventionPrompt(BaseModel):
    issue_id: str
    likely_cause: str
    recommended_action: str
    affected_components: list[str] = Field(default_factory=list)
    verification_required: str = ""


class OrchestratorRun(BaseModel):
    project_id: str
    state: OrchestratorState = OrchestratorState.IDLE
    current_stage: str = ""
    completed_stages: list[str] = Field(default_factory=list)
    failed_stage: str = ""
    last_error: str = ""
    started_at: str = ""
    completed_at: str = ""
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

    # Phase 2 additions
    review_iteration: int = 1
    correction_count: int = 0
    max_corrections: int = 2
    correction_target: str = ""
    review_decision: str = ""
    unresolved_findings: list[dict[str, Any]] = Field(default_factory=list)
    invalidation_history: list[InvalidationRecord] = Field(default_factory=list)
    human_decision_prompt: HumanDecisionPrompt | None = None

    # Phase 3 additions
    active_issue_id: str = ""
    recovery_state: str = "IDLE"
    recovery_type: str = ""
    recovery_target: str = ""
    recovery_attempt: int = 0
    max_recovery_attempts: int = 2
    human_decision_response: str = ""
    manual_intervention_required: bool = False
    manual_intervention_completed: bool = False
    manual_intervention_prompt: ManualInterventionPrompt | None = None
    recovery_history: list[RecoveryRecord] = Field(default_factory=list)

    # Long-Term Engineering Memory additions
    retrieved_memories: list["RetrievedMemory"] = Field(default_factory=list)


class EngineeringMemory(BaseModel):
    memory_id: str
    source_project_id: str
    source_issue_id: str | None = None
    created_at: str
    category: str  # "Architecture", "Execution Plan", "Testing", "Operational", "Hardware"
    problem_pattern: str
    context_tags: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    affected_component_types: list[str] = Field(default_factory=list)
    diagnosis: str
    successful_action: str
    verification_summary: str
    requirement_patterns: list[str] = Field(default_factory=list)
    architecture_patterns: list[str] = Field(default_factory=list)
    risk_patterns: list[str] = Field(default_factory=list)
    confidence: float = 0.8
    times_retrieved: int = 0
    times_helpful: int = 0
    status: str = "ACTIVE"  # "ACTIVE" | "ARCHIVED"


class RetrievedMemory(BaseModel):
    memory: EngineeringMemory
    relevance_score: float
    reason_retrieved: str
    agent_used_by: str


class MemoryFeedbackInput(BaseModel):
    helpful: bool


OrchestratorRun.model_rebuild()

