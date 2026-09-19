import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import APIStatusError, AuthenticationError, NotFoundError, RateLimitError

from app.agents.architecture_agent import architecture_agent
from app.agents.planner_agent import planner_agent
from app.agents.requirement_agent import requirement_agent
from app.agents.reviewer_agent import reviewer_agent
from app.agents.test_agent import test_agent
from app.ai.nvidia_client import nvidia_client
from app.schemas import (
    ArchitectureRequest,
    ArchitectureResponse,
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
)

app = FastAPI(title="ProjectPilot AI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

import json
from pathlib import Path
from datetime import UTC, datetime

projects: dict[str, ProjectContext] = {}
requirements_store: dict[str, RequirementsResponse] = {}
activity_store: dict[str, list[dict[str, object]]] = {}
architecture_store: dict[str, ArchitectureResponse] = {}
plan_store: dict[str, PlannerResponse] = {}
review_store: dict[str, ReviewResponse] = {}
test_store: dict[str, TestResponse] = {}
issues_store: dict[str, list[IssueRecord]] = {}
orchestrator_store: dict[str, OrchestratorRun] = {}

DB_FILE = Path(__file__).parent / "db.json"

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
            "orchestrator_store": {k: v.model_dump() for k, v in orchestrator_store.items()}
        }
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Failed to save db: {e}")

_load_db()

def _now_iso() -> str:
    return datetime.now(UTC).isoformat()

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
    _save_db()
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
    _save_db()
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
        raise HTTPException(status_code=502, detail="NVIDIA authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="NVIDIA rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nemotron model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="NVIDIA provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = PlannerResponse(
        **analysis.model_dump(),
        project_id=project_id,
        model=nvidia_client.model,
        duration_ms=duration_ms,
    )
    plan_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Planner Agent",
        "action": "Generate Execution Plan",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": f"{len(analysis.milestones)} milestones, {len(analysis.tasks)} tasks planned",
    })
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
    try:
        analysis, duration_ms = reviewer_agent.analyze(request.project, requirements, architecture)
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

    response = ReviewResponse(
        **analysis.model_dump(),
        project_id=project_id,
        model=nvidia_client.model,
        duration_ms=duration_ms,
    )
    review_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Reviewer Agent",
        "action": "Run Project Review",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "timestamp": _now_iso(),
        "summary": f"Detected {len(analysis.risks)} engineering risks/gaps",
    })
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
    try:
        analysis, duration_ms = test_agent.analyze(request.project, requirements, architecture)
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

    response = TestResponse(
        **analysis.model_dump(),
        project_id=project_id,
        model=nvidia_client.model,
        duration_ms=duration_ms,
    )
    test_store[project_id] = response
    _save_db()
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Test Agent",
        "action": "Generate Verification Strategy",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": f"{len(analysis.test_cases)} test cases generated",
    })
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
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": analysis.issue_summary,
    })
    
    return issue


import asyncio
import uuid
import datetime

MAX_EXECUTIONS = 10
MAX_CORRECTIONS = 2

async def orchestrator_loop(project_id: str):
    run = orchestrator_store.get(project_id)
    if not run: return
    
    while run.is_running and not run.human_input_required:
        project = projects.get(project_id)
        if not project:
            run.error_message = "Project context missing."
            run.state = OrchestratorState.FAILED
            run.is_running = False
            break
            
        if run.execution_count >= MAX_EXECUTIONS:
            run.human_input_required = True
            run.human_input_reason = "Maximum autonomous executions reached. Please review the project."
            run.state = OrchestratorState.PAUSED
            run.is_running = False
            break

        # Evaluate State
        reqs = requirements_store.get(project_id)
        arch = architecture_store.get(project_id)
        plan = plan_store.get(project_id)
        review = review_store.get(project_id)
        tests = test_store.get(project_id)
        issues = issues_store.get(project_id, [])
        
        # Check for blocking issues
        open_critical_issues = [i for i in issues if i.status != "Resolved" and i.analysis.severity.lower() in ["critical", "high"]]
        if open_critical_issues:
            run.state = OrchestratorState.BLOCKED
            run.human_input_required = True
            run.human_input_reason = f"Blocked by critical unresolved issue: {open_critical_issues[0].analysis.issue_summary}"
            run.is_running = False
            break

        prev_state = run.state.value

        # Decision Engine
        if not reqs:
            run.state = OrchestratorState.REQUIREMENTS_PENDING
            action = "Run Requirement Agent"
            agent = "Requirement Agent"
            reason = "No requirement artifact exists."
        elif not arch:
            run.state = OrchestratorState.ARCHITECTURE_PENDING
            action = "Run Architecture Agent"
            agent = "Architecture Agent"
            reason = "Requirements validated successfully. Architecture missing."
        elif not plan:
            run.state = OrchestratorState.PLANNING_PENDING
            action = "Run Planner Agent"
            agent = "Planner Agent"
            reason = "Architecture available and valid. Execution plan missing."
        elif not review:
            run.state = OrchestratorState.REVIEW_PENDING
            action = "Run Reviewer Agent"
            agent = "Reviewer Agent"
            reason = "Execution plan generated. Review pending."
        elif not tests:
            run.state = OrchestratorState.TESTING_PENDING
            action = "Run Test Agent"
            agent = "Test Agent"
            reason = "Project reviewed successfully. Tests missing."
        else:
            run.state = OrchestratorState.READY
            run.is_running = False
            run.current_agent = ""
            run.current_action = ""
            run.progress_steps = ["Project is ready for execution"]
            dec = DecisionRecord(id=uuid.uuid4().hex[:8], timestamp=datetime.datetime.utcnow().isoformat(), previous_state=prev_state, next_state=run.state.value, action="Complete", agent="System", reason="All stages complete.", result="Success")
            run.decisions.insert(0, dec)
            _save_db()
            break

        if run.state.value == prev_state and run.execution_count > 0:
            # We are stuck in a loop without progressing
            run.human_input_required = True
            run.human_input_reason = f"Agent {agent} failed to advance the state."
            run.state = OrchestratorState.PAUSED
            run.is_running = False
            break

        run.current_agent = agent
        run.current_action = action
        run.progress_steps = [f"Starting {agent}"]
        dec = DecisionRecord(
            id=uuid.uuid4().hex[:8],
            timestamp=datetime.datetime.utcnow().isoformat(),
            previous_state=prev_state,
            next_state=run.state.value,
            action=action,
            agent=agent,
            reason=reason
        )
        run.decisions.insert(0, dec)
        _save_db()

        activity_store.setdefault(project_id, []).insert(0, {
            "agent": "Orchestrator",
            "action": f"Selected {agent}",
            "provider": "System Decision",
            "model": "Rules Engine",
            "status": "completed",
            "duration_ms": 10,
            "summary": reason,
        })

        # Execute Agent
        run.execution_count += 1
        try:
            if agent == "Requirement Agent":
                analysis, duration = requirement_agent.analyze(project)
                requirements_store[project_id] = analysis
                run.progress_steps = ["Analyzed requirements", "Persisted artifacts"]
                
            elif agent == "Architecture Agent":
                analysis, duration = architecture_agent.analyze(project, reqs)
                architecture_store[project_id] = analysis
                run.progress_steps = ["Generated architecture components", "Mapped dependencies"]
                
            elif agent == "Planner Agent":
                analysis, duration = planner_agent.analyze(project, reqs, arch)
                plan_store[project_id] = analysis
                run.progress_steps = ["Formulated execution tasks", "Identified milestones"]
                
            elif agent == "Reviewer Agent":
                analysis, duration = reviewer_agent.analyze(project, reqs, arch)
                review_store[project_id] = analysis
                
                # Reviewer Feedback Loop Check
                critical_risks = [r for r in analysis.risks if r.severity.lower() in ["critical", "high"]]
                if critical_risks:
                    run.correction_cycles += 1
                    if run.correction_cycles > MAX_CORRECTIONS:
                        run.human_input_required = True
                        run.human_input_reason = f"Reviewer found critical issues: {critical_risks[0].title}. Max corrections reached."
                        run.state = OrchestratorState.PAUSED
                        run.is_running = False
                    else:
                        # Invalidate previous steps based on reviewer logic (simplified: invalidate Plan)
                        plan_store.pop(project_id, None)
                        review_store.pop(project_id, None)
                        run.progress_steps = ["Reviewer found issues", "Invalidated Plan for regeneration"]
                else:
                    run.progress_steps = ["Review completed successfully", "No blocking issues"]
                    
            elif agent == "Test Agent":
                analysis, duration = test_agent.analyze(project, reqs, arch)
                test_store[project_id] = analysis
                run.progress_steps = ["Generated verification strategy"]

            dec.result = "Success"
            
            # Log real agent execution
            activity_store.setdefault(project_id, []).insert(0, {
                "agent": agent,
                "action": f"Autonomous {action}",
                "provider": "NVIDIA",
                "model": nvidia_client.model,
                "status": "completed",
                "duration_ms": duration,
                "summary": "Completed successfully via Orchestrator",
            })
            
        except Exception as e:
            dec.result = f"Failed: {str(e)}"
            run.error_message = str(e)
            run.state = OrchestratorState.FAILED
            run.is_running = False
            
            # Log failure
            activity_store.setdefault(project_id, []).insert(0, {
                "agent": agent,
                "action": f"Autonomous {action}",
                "provider": "NVIDIA",
                "model": nvidia_client.model,
                "status": "failed",
                "duration_ms": 0,
                "summary": str(e),
            })
            
        _save_db()
        await asyncio.sleep(1) # Small pause for UI polish and safety

# Endpoints
from fastapi import BackgroundTasks

@app.post("/api/projects/{project_id}/orchestrator/start")
def start_orchestrator(project_id: str, background_tasks: BackgroundTasks):
    run = orchestrator_store.get(project_id)
    if not run:
        run = OrchestratorRun(project_id=project_id, state=OrchestratorState.INITIALIZED)
        orchestrator_store[project_id] = run
    
    run.is_running = True
    run.human_input_required = False
    run.error_message = ""
    run.state = OrchestratorState.INITIALIZED
    _save_db()
    
    background_tasks.add_task(orchestrator_loop, project_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/pause")
def pause_orchestrator(project_id: str):
    run = orchestrator_store.get(project_id)
    if run:
        run.is_running = False
        run.state = OrchestratorState.PAUSED
        _save_db()
    return run

@app.post("/api/projects/{project_id}/orchestrator/resume")
def resume_orchestrator(project_id: str, background_tasks: BackgroundTasks):
    run = orchestrator_store.get(project_id)
    if run:
        run.is_running = True
        run.human_input_required = False
        _save_db()
        background_tasks.add_task(orchestrator_loop, project_id)
    return run

@app.post("/api/projects/{project_id}/orchestrator/stop")
def stop_orchestrator(project_id: str):
    run = orchestrator_store.get(project_id)
    if run:
        run.is_running = False
        run.state = OrchestratorState.INITIALIZED
        _save_db()
    return run

@app.get("/api/projects/{project_id}/orchestrator/status", response_model=OrchestratorRun)
def get_orchestrator_status(project_id: str):
    run = orchestrator_store.get(project_id)
    if not run:
        run = OrchestratorRun(project_id=project_id, state=OrchestratorState.INITIALIZED)
        orchestrator_store[project_id] = run
    return run
