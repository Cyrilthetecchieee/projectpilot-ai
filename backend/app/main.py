import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import APIStatusError, AuthenticationError, NotFoundError, RateLimitError

from app.agents.architecture_agent import architecture_agent
from app.agents.planner_agent import planner_agent
from app.agents.requirement_agent import requirement_agent
from app.ai.nvidia_client import nvidia_client
from app.schemas import (
    ArchitectureRequest,
    ArchitectureResponse,
    ExecutionPlanResponse,
    PlannerRequest,
    ProjectContext,
    RequirementsRequest,
    RequirementsResponse,
)

app = FastAPI(title="ProjectPilot AI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

STORAGE_FILE = Path(__file__).resolve().parent / "storage" / "projectpilot_store.json"
STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)

projects: dict[str, ProjectContext] = {}
requirements_store: dict[str, RequirementsResponse] = {}
architecture_store: dict[str, ArchitectureResponse] = {}
plan_store: dict[str, ExecutionPlanResponse] = {}
activity_store: dict[str, list[dict[str, object]]] = {}


def _save_storage() -> None:
    try:
        data = {
            "projects": {k: v.model_dump() for k, v in projects.items()},
            "requirements": {k: v.model_dump() for k, v in requirements_store.items()},
            "architecture": {k: v.model_dump() for k, v in architecture_store.items()},
            "plans": {k: v.model_dump() for k, v in plan_store.items()},
            "activity": activity_store,
        }
        STORAGE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_storage() -> None:
    if not STORAGE_FILE.exists():
        return
    try:
        raw = json.loads(STORAGE_FILE.read_text(encoding="utf-8"))
        for k, v in raw.get("projects", {}).items():
            projects[k] = ProjectContext.model_validate(v)
        for k, v in raw.get("requirements", {}).items():
            requirements_store[k] = RequirementsResponse.model_validate(v)
        for k, v in raw.get("architecture", {}).items():
            architecture_store[k] = ArchitectureResponse.model_validate(v)
        for k, v in raw.get("plans", {}).items():
            plan_store[k] = ExecutionPlanResponse.model_validate(v)
        for k, v in raw.get("activity", {}).items():
            activity_store[k] = v
    except Exception:
        pass


_load_storage()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "provider": "NVIDIA", "model": nvidia_client.model}


@app.post("/api/projects/{project_id}/agents/requirements", response_model=RequirementsResponse)
def analyze_requirements(project_id: str, request: RequirementsRequest) -> RequirementsResponse:
    if request.project.id != project_id:
        raise HTTPException(status_code=400, detail="Project payload ID does not match the URL")
    projects[project_id] = request.project
    try:
        analysis, duration_ms = requirement_agent.analyze(request.project)
    except AuthenticationError as error:
        raise HTTPException(status_code=502, detail="NVIDIA authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="NVIDIA rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nemotron model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="NVIDIA provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = RequirementsResponse(
        **analysis.model_dump(),
        project_id=project_id,
        model=nvidia_client.model,
        duration_ms=duration_ms,
        summary=(f"{len(analysis.functional_requirements)} functional and "
                 f"{len(analysis.non_functional_requirements)} non-functional requirements identified"),
    )
    requirements_store[project_id] = response
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Requirement Agent",
        "action": "Analyze Requirements",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": response.summary,
    })
    _save_storage()
    return response


@app.get("/api/projects/{project_id}/requirements", response_model=RequirementsResponse)
def get_requirements(project_id: str) -> RequirementsResponse:
    result = requirements_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Requirements have not been analyzed")
    return result


@app.post("/api/projects/{project_id}/agents/architecture", response_model=ArchitectureResponse)
def generate_architecture(project_id: str, request: ArchitectureRequest) -> ArchitectureResponse:
    if request.project.id != project_id:
        raise HTTPException(status_code=400, detail="Project payload ID does not match the URL")
    requirements = requirements_store.get(project_id)
    if not requirements:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "REQUIREMENTS_REQUIRED",
                "message": "Analyze project requirements before generating architecture.",
            },
        )
    projects[project_id] = request.project
    try:
        analysis, duration_ms = architecture_agent.analyze(request.project, requirements)
    except AuthenticationError as error:
        raise HTTPException(status_code=502, detail="NVIDIA authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="NVIDIA rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nemotron model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="NVIDIA provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = ArchitectureResponse(
        **analysis.model_dump(),
        project_id=project_id,
        model=nvidia_client.model,
        duration_ms=duration_ms,
    )
    architecture_store[project_id] = response
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Architecture Agent",
        "action": "Generate Architecture",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": response.summary,
    })
    _save_storage()
    return response


@app.get("/api/projects/{project_id}/architecture", response_model=ArchitectureResponse)
def get_architecture(project_id: str) -> ArchitectureResponse:
    result = architecture_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Architecture has not been generated")
    return result


@app.post("/api/projects/{project_id}/agents/plan", response_model=ExecutionPlanResponse)
def generate_plan(project_id: str, request: PlannerRequest) -> ExecutionPlanResponse:
    if request.project.id != project_id:
        raise HTTPException(status_code=400, detail="Project payload ID does not match the URL")
    requirements = requirements_store.get(project_id)
    if not requirements:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "REQUIREMENTS_REQUIRED",
                "message": "Analyze project requirements before generating an execution plan.",
            },
        )
    architecture = architecture_store.get(project_id)
    if not architecture:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "ARCHITECTURE_REQUIRED",
                "message": "Generate project architecture before generating an execution plan.",
            },
        )
    projects[project_id] = request.project
    try:
        analysis, duration_ms = planner_agent.analyze(request.project, requirements, architecture)
    except AuthenticationError as error:
        raise HTTPException(status_code=502, detail="NVIDIA authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="NVIDIA rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nemotron model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="NVIDIA provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = ExecutionPlanResponse(
        **analysis.model_dump(),
        project_id=project_id,
        model=nvidia_client.model,
        duration_ms=duration_ms,
    )
    plan_store[project_id] = response
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Planner Agent",
        "action": "Generate Execution Plan",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": response.summary,
    })
    _save_storage()
    return response


@app.get("/api/projects/{project_id}/plan", response_model=ExecutionPlanResponse)
def get_plan(project_id: str) -> ExecutionPlanResponse:
    result = plan_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Execution plan has not been generated")
    return result


@app.get("/api/projects/{project_id}/activity")
def get_activity(project_id: str) -> list[dict[str, object]]:
    return activity_store.get(project_id, [])
