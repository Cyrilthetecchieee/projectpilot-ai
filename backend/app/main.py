import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

# Ensure 'backend' directory is in sys.path so 'import app...' works from any working directory
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import APIStatusError, AuthenticationError, NotFoundError, RateLimitError

from app.agents.architecture_agent import architecture_agent
from app.agents.planner_agent import planner_agent
from app.agents.requirement_agent import requirement_agent
from app.agents.reviewer_agent import reviewer_agent
from app.agents.test_agent import test_agent
from app.ai.nebius_client import nebius_client
from app.ai.nvidia_client import nvidia_client
from app.schemas import (
    ArchitectureRequest,
    ArchitectureResponse,
    ExecutionPlanResponse,
    PlannerRequest,
    PlannerResponse,
    ProjectContext,
    RequirementsRequest,
    RequirementsResponse,
    ReviewRequest,
    ReviewResponse,
    TestRequest,
    TestResponse,
    IssueRecord,
    IssueAnalysisResponse,
    OrchestratorRun,
    OrchestratorState,
    DecisionRecord,
    HumanDecisionInput,
    EngineeringMemory,
    RetrievedMemory,
    MemoryFeedbackInput,
)
from app.services.memory_service import memory_service

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
DB_FILE = Path(__file__).parent / "db.json"

projects: dict[str, ProjectContext] = {}
requirements_store: dict[str, RequirementsResponse] = {}
architecture_store: dict[str, ArchitectureResponse] = {}
plan_store: dict[str, PlannerResponse] = {}
review_store: dict[str, ReviewResponse] = {}
test_store: dict[str, TestResponse] = {}
issues_store: dict[str, list[IssueRecord]] = {}
orchestrator_store: dict[str, OrchestratorRun] = {}
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
            plan_store[k] = PlannerResponse.model_validate(v)
        for k, v in raw.get("activity", {}).items():
            activity_store[k] = v
    except Exception:
        pass


def _load_db() -> None:
    if not DB_FILE.exists():
        return
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "requirements_store" in data:
            for k, v in data["requirements_store"].items():
                requirements_store[k] = RequirementsResponse(**v)
        if "architecture_store" in data:
            for k, v in data["architecture_store"].items():
                architecture_store[k] = ArchitectureResponse(**v)
        if "review_store" in data:
            for k, v in data["review_store"].items():
                review_store[k] = ReviewResponse(**v)
        if "test_store" in data:
            for k, v in data["test_store"].items():
                test_store[k] = TestResponse(**v)
        if "issues_store" in data:
            for k, v in data["issues_store"].items():
                issues_store[k] = [IssueRecord(**i) for i in v]
        if "plan_store" in data:
            for k, v in data["plan_store"].items():
                plan_store[k] = PlannerResponse(**v)
        if "projects" in data:
            for k, v in data["projects"].items():
                projects[k] = ProjectContext(**v)
        if "orchestrator_store" in data:
            for k, v in data["orchestrator_store"].items():
                orchestrator_store[k] = OrchestratorRun(**v)
        if "activity_store" in data:
            for k, v in data["activity_store"].items():
                activity_store[k] = v
        memory_service.load()
    except Exception as e:
        print(f"Failed to load db: {e}")


def _save_db() -> None:
    try:
        data = {
            "requirements_store": {k: v.model_dump() for k, v in requirements_store.items()},
            "architecture_store": {k: v.model_dump() for k, v in architecture_store.items()},
            "review_store": {k: v.model_dump() for k, v in review_store.items()},
            "test_store": {k: v.model_dump() for k, v in test_store.items()},
            "issues_store": {k: [i.model_dump() for i in v] for k, v in issues_store.items()},
            "plan_store": {k: v.model_dump() for k, v in plan_store.items()},
            "projects": {k: v.model_dump() for k, v in projects.items()},
            "orchestrator_store": {k: v.model_dump() for k, v in orchestrator_store.items()},
            "activity_store": activity_store,
        }
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
        memory_service.save()
    except Exception as e:
        print(f"Failed to save db: {e}")
    _save_storage()


_load_storage()
_load_db()

def _now_iso() -> str:
    import datetime as _dt
    return _dt.datetime.now(_dt.timezone.utc).isoformat()

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
        raise HTTPException(status_code=502, detail="Nebius authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="Nebius rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nebius model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="Nebius provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = RequirementsResponse(
        **analysis.model_dump(),
        project_id=project_id,
        provider="Nebius Token Factory",
        model=requirement_agent.model,
        duration_ms=duration_ms,
        summary=(f"{len(analysis.functional_requirements)} functional and "
                 f"{len(analysis.non_functional_requirements)} non-functional requirements identified"),
    )
    requirements_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Requirement Agent",
        "action": "Analyze Requirements",
        "provider": "Nebius Token Factory",
        "model": requirement_agent.model,
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
        raise HTTPException(status_code=502, detail="Nebius authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="Nebius rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nebius model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="Nebius provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = ArchitectureResponse(
        **analysis.model_dump(),
        project_id=project_id,
        provider="Nebius Token Factory",
        model=architecture_agent.model,
        duration_ms=duration_ms,
    )
    architecture_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Architecture Agent",
        "action": "Generate Architecture",
        "provider": "Nebius Token Factory",
        "model": architecture_agent.model,
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


@app.post("/api/projects/{project_id}/agents/plan", response_model=PlannerResponse)
def generate_plan(project_id: str, request: PlannerRequest) -> PlannerResponse:
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
        raise HTTPException(status_code=502, detail="Nebius authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="Nebius rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nebius model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="Nebius provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = PlannerResponse(
        **analysis.model_dump(),
        project_id=project_id,
        provider="Nebius Token Factory",
        model=planner_agent.model,
        duration_ms=duration_ms,
    )
    plan_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Planner Agent",
        "action": "Generate Execution Plan",
        "provider": "Nebius Token Factory",
        "model": planner_agent.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": response.summary,
    })
    _save_storage()
    return response


@app.get("/api/projects/{project_id}/plan", response_model=PlannerResponse)
def get_plan(project_id: str) -> PlannerResponse:
    result = plan_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Execution plan has not been generated")
    return result


@app.get("/api/projects/{project_id}/activity")
def get_activity(project_id: str) -> list[dict[str, object]]:
    return activity_store.get(project_id, [])


@app.post("/api/projects/{project_id}/agents/review", response_model=ReviewResponse)
def generate_review(project_id: str, request: ReviewRequest) -> ReviewResponse:
    if request.project.id != project_id:
        raise HTTPException(status_code=400, detail="Project payload ID does not match the URL")
    requirements = requirements_store.get(project_id)
    if not requirements:
        raise HTTPException(status_code=409, detail={"code": "REQUIREMENTS_REQUIRED", "message": "Analyze project requirements before generating a review."})
    architecture = architecture_store.get(project_id)
    if not architecture:
        raise HTTPException(status_code=409, detail={"code": "ARCHITECTURE_REQUIRED", "message": "Generate project architecture before generating a review."})
    
    projects[project_id] = request.project
    plan = plan_store.get(project_id)
    try:
        analysis, duration_ms = reviewer_agent.analyze(request.project, requirements, architecture, plan=plan)
    except AuthenticationError as error:
        raise HTTPException(status_code=502, detail="Nebius authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="Nebius rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nebius model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="Nebius provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = ReviewResponse(
        **analysis.model_dump(),
        project_id=project_id,
        provider="Nebius Token Factory",
        model=reviewer_agent.model,
        duration_ms=duration_ms,
    )
    review_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Reviewer Agent",
        "action": "Run Project Review",
        "provider": "Nebius Token Factory",
        "model": reviewer_agent.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "timestamp": _now_iso(),
        "summary": f"Detected {len(analysis.risks)} engineering risks/gaps",
    })
    _save_storage()
    return response

@app.get("/api/projects/{project_id}/review", response_model=ReviewResponse)
def get_review(project_id: str) -> ReviewResponse:
    result = review_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Review has not been generated")
    return result


@app.post("/api/projects/{project_id}/agents/tests", response_model=TestResponse)
def generate_tests(project_id: str, request: TestRequest) -> TestResponse:
    if request.project.id != project_id:
        raise HTTPException(status_code=400, detail="Project payload ID does not match the URL")
    requirements = requirements_store.get(project_id)
    if not requirements:
        raise HTTPException(status_code=409, detail={"code": "REQUIREMENTS_REQUIRED", "message": "Analyze project requirements before generating tests."})
    architecture = architecture_store.get(project_id)
    if not architecture:
        raise HTTPException(status_code=409, detail={"code": "ARCHITECTURE_REQUIRED", "message": "Generate project architecture before generating tests."})
    
    projects[project_id] = request.project
    plan = plan_store.get(project_id)
    review = review_store.get(project_id)
    try:
        analysis, duration_ms = test_agent.analyze(request.project, requirements, architecture, plan=plan, review=review)
    except AuthenticationError as error:
        raise HTTPException(status_code=502, detail="Nebius authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="Nebius rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nebius model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="Nebius provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = TestResponse(
        **analysis.model_dump(),
        project_id=project_id,
        provider="Nebius Token Factory",
        model=test_agent.model,
        duration_ms=duration_ms,
    )
    test_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Test Agent",
        "action": "Generate Verification Strategy",
        "provider": "Nebius Token Factory",
        "model": test_agent.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": f"{len(analysis.test_cases)} test cases generated",
    })
    _save_storage()
    return response

@app.get("/api/projects/{project_id}/tests", response_model=TestResponse)
def get_tests(project_id: str) -> TestResponse:
    result = test_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tests have not been generated")
    return result

import uuid
import datetime

os.makedirs("uploads", exist_ok=True)

import json

@app.post("/api/projects/{project_id}/issues", response_model=IssueRecord)
async def report_issue(project_id: str, project_data: str = Form(...), task_id: str = Form(...), description: str = Form(...), image: UploadFile | None = None):
    try:
        p_data = json.loads(project_data)
        
        # Build ProjectContext
        from app.schemas import ProjectContext
        project = ProjectContext(
            id=p_data.get("id", project_id),
            name=p_data.get("name", "Unknown"),
            objective=p_data.get("objective", ""),
            type=p_data.get("type", ""),
            technologies=p_data.get("technologies", [])
        )
        
        # Build RequirementAnalysis
        reqs = p_data.get("requirements", [])
        from app.schemas import RequirementItem, Priority, RequirementAnalysis
        def map_req(r): return RequirementItem(title=r.get("text", "Req")[:50], description=r.get("text", ""), priority=r.get("priority", "medium").lower())
        requirements = RequirementAnalysis(
            problem=p_data.get("requirementProblem", "None"),
            functional_requirements=[map_req(r) for r in reqs if r.get("kind") == "Functional"],
            non_functional_requirements=[map_req(r) for r in reqs if r.get("kind") == "Non-functional"]
        )
        
        # Build ArchitectureAnalysis
        archs = p_data.get("architecture", [])
        from app.schemas import ArchitectureComponent, ArchitectureAnalysis
        components = []
        for a in archs:
            components.append(ArchitectureComponent(
                id=a.get("id", "ac"),
                name=a.get("name", "Unknown"),
                type=a.get("type", "other"),
                responsibility=a.get("responsibility", ""),
                inputs=a.get("inputs", []),
                outputs=a.get("outputs", [])
            ))
        if not components:
            components = [ArchitectureComponent(id="mock", name="mock", type="other", responsibility="mock")]
        architecture = ArchitectureAnalysis(
            summary="Mock summary",
            components=components
        )
        
        # Build ExecutionPlan
        tasks_data = p_data.get("tasks", [])
        from app.schemas import ExecutionPlan, PlannerTask, Milestone
        tasks = []
        target_task = None
        for i, t in enumerate(tasks_data):
            pt = PlannerTask(
                id=t.get("id", f"t-{i}"),
                milestone_id="m-1",
                title=t.get("title", ""),
                description=t.get("successCriteria", ""),
                priority=t.get("priority", "medium").lower(),
                status="todo"
            )
            tasks.append(pt)
            if pt.id == task_id:
                target_task = pt
                
        plan = ExecutionPlan(
            summary="Plan",
            milestones=[Milestone(id="m-1", title="Default Milestone", order=1)],
            tasks=tasks if tasks else [PlannerTask(id="mock", milestone_id="m-1", title="mock", priority="medium")]
        )
        
        if not target_task:
            target_task = PlannerTask(id=task_id, milestone_id="m-1", title="Unknown Task", priority="medium")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid project_data JSON: {e}")

    image_bytes = None
    image_path = ""
    if image and image.filename:
        image_bytes = await image.read()
        if image_bytes:
            filename = f"{uuid.uuid4()}_{image.filename}"
            filepath = os.path.join("uploads", filename)
            with open(filepath, "wb") as out:
                out.write(image_bytes)
            image_path = filepath
            
    try:
        analysis, duration_ms = reviewer_agent.analyze_issue(project, requirements, architecture, plan, target_task, description, image_bytes)
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    issue = IssueRecord(
        id=f"iss-{uuid.uuid4().hex[:8]}",
        project_id=project_id,
        task_id=task_id,
        description=description,
        image_path=image_path,
        analysis=analysis,
        status="Open",
        created_at=datetime.datetime.utcnow().isoformat()
    )
    
    issues_store.setdefault(project_id, []).append(issue)
    _save_db()
    
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Reviewer Agent",
        "action": "Analyze Execution Issue",
        "provider": "Nebius Token Factory",
        "model": reviewer_agent.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": analysis.issue_summary,
    })
    _save_storage()
    
    return issue


import asyncio
import uuid
import datetime
from fastapi import BackgroundTasks
from app.services.orchestrator_service import OrchestratorService

orchestrator_service = OrchestratorService(
    projects=projects,
    requirements_store=requirements_store,
    architecture_store=architecture_store,
    plan_store=plan_store,
    review_store=review_store,
    test_store=test_store,
    orchestrator_store=orchestrator_store,
    activity_store=activity_store,
    save_db_fn=_save_db,
    now_iso_fn=_now_iso,
    issues_store=issues_store,
)

@app.post("/api/projects/{project_id}/orchestrator/start", response_model=OrchestratorRun)
def start_orchestrator(project_id: str, background_tasks: BackgroundTasks) -> OrchestratorRun:
    try:
        run = orchestrator_service.start(project_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    background_tasks.add_task(orchestrator_service.run_pipeline, project_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/retry", response_model=OrchestratorRun)
def retry_orchestrator(project_id: str, background_tasks: BackgroundTasks) -> OrchestratorRun:
    run = orchestrator_service.retry(project_id)
    background_tasks.add_task(orchestrator_service.run_pipeline, project_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/pause", response_model=OrchestratorRun)
def pause_orchestrator(project_id: str) -> OrchestratorRun:
    return orchestrator_service.stop(project_id)

@app.post("/api/projects/{project_id}/orchestrator/resume", response_model=OrchestratorRun)
def resume_orchestrator(project_id: str, background_tasks: BackgroundTasks) -> OrchestratorRun:
    try:
        run = orchestrator_service.start(project_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    background_tasks.add_task(orchestrator_service.run_pipeline, project_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/stop", response_model=OrchestratorRun)
def stop_orchestrator(project_id: str) -> OrchestratorRun:
    return orchestrator_service.stop(project_id)

@app.get("/api/projects/{project_id}/orchestrator/status", response_model=OrchestratorRun)
def get_orchestrator_status(project_id: str) -> OrchestratorRun:
    return orchestrator_service.get_or_create_run(project_id)

@app.post("/api/projects/{project_id}/orchestrator/provide-decision", response_model=OrchestratorRun)
def provide_orchestrator_decision(
    project_id: str,
    payload: HumanDecisionInput,
    background_tasks: BackgroundTasks,
) -> OrchestratorRun:
    run = orchestrator_service.provide_human_decision(project_id, payload.decision)
    if run.active_issue_id:
        background_tasks.add_task(orchestrator_service.run_issue_recovery_pipeline, project_id, run.active_issue_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/continue-manually", response_model=OrchestratorRun)
def continue_orchestrator_manually(
    project_id: str,
    background_tasks: BackgroundTasks,
) -> OrchestratorRun:
    run = orchestrator_service.continue_manually(project_id)
    background_tasks.add_task(orchestrator_service.run_pipeline, project_id)
    return run

@app.post("/api/projects/{project_id}/issues/{issue_id}/recover", response_model=OrchestratorRun)
def recover_issue(
    project_id: str,
    issue_id: str,
    background_tasks: BackgroundTasks,
) -> OrchestratorRun:
    try:
        run = orchestrator_service.start_issue_recovery(project_id, issue_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    background_tasks.add_task(orchestrator_service.run_issue_recovery_pipeline, project_id, issue_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/confirm-intervention", response_model=OrchestratorRun)
def confirm_orchestrator_intervention(
    project_id: str,
    background_tasks: BackgroundTasks,
) -> OrchestratorRun:
    run = orchestrator_service.confirm_manual_intervention(project_id)
    if run.active_issue_id:
        background_tasks.add_task(orchestrator_service.run_issue_recovery_pipeline, project_id, run.active_issue_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/retry-recovery", response_model=OrchestratorRun)
def retry_orchestrator_recovery(
    project_id: str,
    background_tasks: BackgroundTasks,
) -> OrchestratorRun:
    run = orchestrator_service.retry_recovery(project_id)
    if run.active_issue_id:
        background_tasks.add_task(orchestrator_service.run_issue_recovery_pipeline, project_id, run.active_issue_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/stop-recovery", response_model=OrchestratorRun)
def stop_orchestrator_recovery(project_id: str) -> OrchestratorRun:
    return orchestrator_service.stop_recovery(project_id)


# ---------------------------------------------------------------------------
# Long-Term Engineering Memory Routes
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project_id}/memory", response_model=list[RetrievedMemory])
def get_project_memory(project_id: str) -> list[RetrievedMemory]:
    run = orchestrator_store.get(project_id)
    if not run:
        return []
    return run.retrieved_memories


@app.get("/api/memory", response_model=list[EngineeringMemory])
def get_all_memories() -> list[EngineeringMemory]:
    return memory_service.get_all_memories()


@app.post("/api/memory/{memory_id}/feedback", response_model=EngineeringMemory)
def provide_memory_feedback(memory_id: str, payload: MemoryFeedbackInput) -> EngineeringMemory:
    updated = memory_service.record_feedback(memory_id, payload.helpful)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Engineering memory '{memory_id}' not found")
    _save_db()
    return updated


