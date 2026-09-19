from typing import Literal

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
