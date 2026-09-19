from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import APIStatusError, AuthenticationError, NotFoundError, RateLimitError

from app.agents.architecture_agent import architecture_agent
from app.agents.requirement_agent import requirement_agent
from app.ai.nvidia_client import nvidia_client
from app.schemas import ArchitectureRequest, ArchitectureResponse, ProjectContext, RequirementsRequest, RequirementsResponse

app = FastAPI(title="ProjectPilot AI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

projects: dict[str, ProjectContext] = {}
requirements_store: dict[str, RequirementsResponse] = {}
activity_store: dict[str, list[dict[str, object]]] = {}
architecture_store: dict[str, ArchitectureResponse] = {}


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
    return response


@app.get("/api/projects/{project_id}/architecture", response_model=ArchitectureResponse)
def get_architecture(project_id: str) -> ArchitectureResponse:
    result = architecture_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Architecture has not been generated")
    return result


@app.get("/api/projects/{project_id}/activity")
def get_activity(project_id: str) -> list[dict[str, object]]:
    return activity_store.get(project_id, [])
