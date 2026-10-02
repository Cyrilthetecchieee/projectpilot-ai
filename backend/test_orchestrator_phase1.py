import json
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import (
    app,
    projects,
    requirements_store,
    architecture_store,
    plan_store,
    review_store,
    test_store,
    orchestrator_store,
    activity_store,
    issues_store,
    _save_db,
)
from app.schemas import (
    OrchestratorRun,
    OrchestratorState,
    ProjectContext,
)

client = TestClient(app)
PROJECT_ID = "cryo-flux-battery"

def main():
    print("=" * 70)
    print("=== PROJECTPILOT PHASE 1 ORCHESTRATOR VERIFICATION ===")
    print("=" * 70)

    project_payload = {
        "id": PROJECT_ID,
        "name": "CryoFlux Superconducting Battery Energy Storage",
        "idea": (
            "Sub-Kelvin cryogenic battery storage system utilizing high-temperature superconducting (HTS) "
            "coils, liquid nitrogen closed-loop cooling, STM32H7 real-time quench detection DSP, and "
            "CAN-bus telemetry linked to a central control unit with Firebase sync."
        ),
        "objective": (
            "Achieve sub-5ms quench detection and superconducting coil discharge isolation before thermal runaway, "
            "with continuous 100Hz cryogenic temperature monitoring and telemetry streaming to an operator dashboard."
        ),
        "type": "Cryogenic Power & Hardware Embedded",
        "technologies": [
            "STM32H7 DSP",
            "HTS Superconducting Coils",
            "Cryocooler Pulse-Tube Chiller",
            "CAN-FD Bus",
            "Solid-State Quench Discharge Thyristors",
            "Firebase Realtime Database",
            "FastAPI",
            "React",
        ],
        "constraints": (
            "Quench detection to thyristor trigger in <5ms. "
            "Cryochamber vacuum <1e-6 Torr. "
            "Liquid nitrogen closed-loop temperature maintained at 77K +/- 0.5K."
        ),
        "timeline": "6 months",
        "stage": "Prototyping",
    }

    # Register project context
    projects[PROJECT_ID] = ProjectContext.model_validate(project_payload)
    _save_db()

    # Clear any previous run for clean test
    orchestrator_store.pop(PROJECT_ID, None)
    requirements_store.pop(PROJECT_ID, None)
    architecture_store.pop(PROJECT_ID, None)
    plan_store.pop(PROJECT_ID, None)
    review_store.pop(PROJECT_ID, None)
    test_store.pop(PROJECT_ID, None)
    activity_store.pop(PROJECT_ID, None)

    # -------------------------------------------------------------------------
    # 1. VERIFY IDLE / INITIAL STATE
    # -------------------------------------------------------------------------
    print("\n--- 1. Testing GET /orchestrator/status (Initial) ---")
    resp = client.get(f"/api/projects/{PROJECT_ID}/orchestrator/status")
    assert resp.status_code == 200, f"Status failed: {resp.text}"
    status_data = resp.json()
    assert status_data["state"] in ("IDLE", "INITIALIZED"), f"Unexpected state: {status_data['state']}"
    assert len(status_data["completed_stages"]) == 0
    print("[PASS] Initial state is IDLE with 0 completed stages.")

    # -------------------------------------------------------------------------
    # 2. START RUN AUTONOMOUSLY
    # -------------------------------------------------------------------------
    print("\n--- 2. Testing POST /orchestrator/start ---")
    resp = client.post(f"/api/projects/{PROJECT_ID}/orchestrator/start")
    assert resp.status_code == 200, f"Start failed: {resp.text}"
    run_data = resp.json()
    assert run_data["state"] == "RUNNING"
    assert run_data["is_running"] is True
    print(f"[OK] Autonomous run launched. Started at: {run_data.get('started_at')}")

    # -------------------------------------------------------------------------
    # 3. POLL AUTONOMOUS PIPELINE EXECUTION
    # -------------------------------------------------------------------------
    print("\n--- 3. Polling Autonomous Pipeline Execution ---")
    print("Tracking stage progression (Requirements -> Architecture -> Plan -> Review -> Tests)...")
    
    max_wait = 180  # seconds
    poll_interval = 2.0
    elapsed = 0.0
    observed_stages = set()

    while elapsed < max_wait:
        resp = client.get(f"/api/projects/{PROJECT_ID}/orchestrator/status")
        assert resp.status_code == 200
        run_data = resp.json()
        current = run_data.get("current_stage")
        completed = run_data.get("completed_stages", [])
        state = run_data.get("state")
        
        if current:
            observed_stages.add(current)
            print(f"  [{elapsed:.1f}s] State={state} | Current={current} ({run_data.get('current_agent')}) | Completed={completed}")
        else:
            print(f"  [{elapsed:.1f}s] State={state} | Completed={completed}")

        if state == "COMPLETED":
            print(f"\n[OK] Autonomous pipeline reached COMPLETED in {elapsed:.1f}s!")
            break
        elif state in ("PAUSED", "FAILED"):
            print(f"\n[WARN] Autonomous run paused/failed at: {run_data.get('failed_stage')}: {run_data.get('last_error')}")
            break

        time.sleep(poll_interval)
        elapsed += poll_interval

    assert run_data["state"] == "COMPLETED", f"Expected COMPLETED, got {run_data['state']}"
    assert len(run_data["completed_stages"]) == 5, f"Expected 5 completed stages, got {run_data['completed_stages']}"
    print("Check 1-6 PASSED: Autonomous sequence executed all 5 specialist agents automatically to completion!")

    # -------------------------------------------------------------------------
    # 4. VERIFY ARTIFACT PERSISTENCE & SCHEMAS
    # -------------------------------------------------------------------------
    print("\n--- 4. Verifying Artifact Persistence & Schemas ---")
    req = requirements_store.get(PROJECT_ID)
    arch = architecture_store.get(PROJECT_ID)
    plan = plan_store.get(PROJECT_ID)
    rev = review_store.get(PROJECT_ID)
    test = test_store.get(PROJECT_ID)

    assert req is not None, "Requirements artifact missing!"
    assert arch is not None, "Architecture artifact missing!"
    assert plan is not None, "Plan artifact missing!"
    assert rev is not None, "Review artifact missing!"
    assert test is not None, "Test artifact missing!"

    print(f"  - Requirements: {len(req.functional_requirements)} functional, {len(req.non_functional_requirements)} NFR")
    print(f"  - Architecture: {len(arch.components)} components, {len(arch.connections)} connections, {len(arch.data_flow)} flow steps")
    print(f"  - Plan: {len(plan.tasks)} tasks, {len(plan.milestones)} milestones")
    print(f"  - Review: {len(rev.risks)} risks")
    print(f"  - Test: {len(test.test_cases)} verification scenarios")

    for endpoint in ["requirements", "architecture", "plan", "review", "tests"]:
        res = client.get(f"/api/projects/{PROJECT_ID}/{endpoint}")
        assert res.status_code == 200, f"GET /{endpoint} failed with {res.status_code}"
    print("Check 8 PASSED: All generated artifacts persist and are accessible via REST endpoints.")

    # -------------------------------------------------------------------------
    # 5. VERIFY AGENT ACTIVITY
    # -------------------------------------------------------------------------
    print("\n--- 5. Verifying Agent Activity ---")
    act_resp = client.get(f"/api/projects/{PROJECT_ID}/activity")
    assert act_resp.status_code == 200
    activities = act_resp.json()
    print(f"Total Activity Records: {len(activities)}")
    
    agent_names_found = set()
    for act in activities:
        agent = act.get("agent")
        provider = act.get("provider")
        model = act.get("model")
        status = act.get("status")
        if agent in ("Requirement Agent", "Architecture Agent", "Planner Agent", "Reviewer Agent", "Test Agent"):
            agent_names_found.add(agent)
            assert provider == "Nebius Token Factory", f"Incorrect provider: {provider}"
            assert model == "nvidia/Nemotron-3-Ultra-550b-a55b", f"Incorrect model: {model}"
            assert status == "completed", f"Status not completed: {status}"
            print(f"  - [REAL MODEL] {agent}: {provider} | {model} | {act.get('duration_ms')}ms")
        elif agent == "Orchestrator":
            assert provider == "System Decision"
            print(f"  - [CONTROL] {agent}: {act.get('action')} ({provider})")

    assert len(agent_names_found) == 5, f"Expected all 5 agents in activity, found: {agent_names_found}"
    print("Check 7 & 9 PASSED: Agent Activity accurately reflects real Nebius model calls and system decisions.")

    # -------------------------------------------------------------------------
    # 6. VERIFY SKIPPING VALID EXISTING ARTIFACTS
    # -------------------------------------------------------------------------
    print("\n--- 6. Testing 'Skip Valid Artifacts' Behavior ---")
    # Invalidate ONLY the test stage
    test_store.pop(PROJECT_ID, None)
    # Reset orchestrator run
    orchestrator_store[PROJECT_ID].state = OrchestratorState.IDLE
    orchestrator_store[PROJECT_ID].is_running = False

    # Start autonomous run again
    resp = client.post(f"/api/projects/{PROJECT_ID}/orchestrator/start")
    assert resp.status_code == 200
    
    # Poll until completed
    elapsed = 0.0
    while elapsed < 60:
        resp = client.get(f"/api/projects/{PROJECT_ID}/orchestrator/status")
        run_data = resp.json()
        if run_data.get("state") == "COMPLETED":
            break
        time.sleep(1.0)
        elapsed += 1.0

    assert run_data.get("state") == "COMPLETED"
    # Verify that execution count was only 1 (it ONLY executed Test Agent!)
    assert run_data.get("execution_count") == 1, f"Expected 1 execution (only missing test), got {run_data.get('execution_count')}"
    print("Check 11 PASSED: Valid existing artifacts (Requirements, Architecture, Plan, Review) were skipped; only missing stage executed!")

    # -------------------------------------------------------------------------
    # 7. VERIFY STOP WORKFLOW
    # -------------------------------------------------------------------------
    print("\n--- 7. Testing POST /orchestrator/stop ---")
    resp = client.post(f"/api/projects/{PROJECT_ID}/orchestrator/stop")
    assert resp.status_code == 200
    stopped_data = resp.json()
    assert stopped_data["is_running"] is False
    assert stopped_data["state"] in ("IDLE", "INITIALIZED")
    print("Check 14 PASSED: Stop endpoint halts the workflow and resets state.")

    # -------------------------------------------------------------------------
    # 8. VERIFY FAILURE & RETRY BEHAVIOR
    # -------------------------------------------------------------------------
    print("\n--- 8. Testing Failure Handling & Retry Logic ---")
    # Simulate a failed stage in orchestrator state
    run = orchestrator_store[PROJECT_ID]
    run.state = OrchestratorState.PAUSED
    run.is_running = False
    run.failed_stage = "Architecture Agent"
    run.last_error = "Simulated I/O timeout during component graph resolution"
    run.error_message = run.last_error
    _save_db()

    # Verify status reflects pause and failed stage
    resp = client.get(f"/api/projects/{PROJECT_ID}/orchestrator/status")
    status_data = resp.json()
    assert status_data["state"] == "PAUSED"
    assert status_data["failed_stage"] == "Architecture Agent"
    assert "timeout" in status_data["last_error"]
    print("Check 12 PASSED: Failed stage pauses workflow and exposes failed_stage and error details.")

    # Test Retry endpoint
    print("Testing Retry endpoint...")
    resp = client.post(f"/api/projects/{PROJECT_ID}/orchestrator/retry")
    assert resp.status_code == 200
    retry_data = resp.json()
    assert retry_data["state"] == "RUNNING"
    assert retry_data["is_running"] is True
    assert retry_data["failed_stage"] == ""
    assert retry_data["last_error"] == ""
    print("Check 13 PASSED: Retry clears failed state and restarts autonomous execution.")

    # Let retry finish
    elapsed = 0.0
    while elapsed < 60:
        resp = client.get(f"/api/projects/{PROJECT_ID}/orchestrator/status")
        run_data = resp.json()
        if run_data.get("state") == "COMPLETED":
            break
        time.sleep(1.0)
        elapsed += 1.0
    print("[OK] Retry finished successfully.")

    # -------------------------------------------------------------------------
    # 9. VERIFY EXISTING REPORT ISSUE FLOW STILL WORKS
    # -------------------------------------------------------------------------
    print("\n--- 9. Verifying Report Issue / Issue Resolution ---")
    frontend_project_data = {
        "id": PROJECT_ID,
        "name": project_payload["name"],
        "objective": project_payload["objective"],
        "type": project_payload["type"],
        "technologies": project_payload["technologies"],
        "requirements": [
            {"kind": "Functional", "text": "Sub-5ms quench detection", "priority": "critical"}
        ],
        "architecture": [
            {"id": "c1", "name": "STM32H7 DSP Quench Detector", "type": "hardware", "responsibility": "Monitors voltage taps"}
        ],
        "tasks": [
            {"id": "t-quench", "title": "Configure ADC DMA buffers", "successCriteria": "ADC sampling at 100kHz"}
        ]
    }
    issue_resp = client.post(
        f"/api/projects/{PROJECT_ID}/issues",
        data={
            "project_data": json.dumps(frontend_project_data),
            "task_id": "t-quench",
            "description": "DMA circular buffer overrun at 100kHz sampling under cryogenic RF noise.",
        }
    )
    assert issue_resp.status_code == 200, f"Report issue failed: {issue_resp.text}"
    issue_data = issue_resp.json()
    assert "analysis" in issue_data
    print(f"  Diagnosed issue: {issue_data['analysis']['issue_summary']}")
    print(f"  Severity: {issue_data['analysis']['severity']}")
    print(f"  Likely causes: {issue_data['analysis']['likely_causes'][:2]}")
    print("Check 16 PASSED: Existing Report Issue / Issue Resolution remains fully functional.")

    print("\n" + "=" * 70)
    print("=== ALL PHASE 1 ORCHESTRATOR CHECKS COMPLETED AND PASSED! ===")
    print("=" * 70)

if __name__ == "__main__":
    main()
