import re

with open("backend/app/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add schemas to imports
if "OrchestratorRun" not in content:
    content = content.replace("IssueAnalysisResponse,", "IssueAnalysisResponse,\n    OrchestratorRun,\n    OrchestratorState,\n    DecisionRecord,")

# 2. Add orchestrator_store
if "orchestrator_store" not in content:
    content = content.replace("issues_store: dict[str, list[IssueRecord]] = {}", "issues_store: dict[str, list[IssueRecord]] = {}\norchestrator_store: dict[str, OrchestratorRun] = {}")

# 3. Add to _save_db and _load_db
content = content.replace('"projects": {k: v.model_dump() for k, v in projects.items()}', '"projects": {k: v.model_dump() for k, v in projects.items()},\n            "orchestrator_store": {k: v.model_dump() for k, v in orchestrator_store.items()}')
load_orch = """        if "orchestrator_store" in data:
            for k, v in data["orchestrator_store"].items():
                orchestrator_store[k] = OrchestratorRun(**v)"""
content = content.replace('projects[k] = ProjectContext(**v)', f'projects[k] = ProjectContext(**v)\n{load_orch}')

# 4. Add Orchestrator Logic and Background Task
orchestrator_logic = """
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
"""

if "orchestrator_loop" not in content:
    content += "\n" + orchestrator_logic

with open("backend/app/main.py", "w", encoding="utf-8") as f:
    f.write(content)
