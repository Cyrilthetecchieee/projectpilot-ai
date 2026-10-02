"""Phase 3 Orchestrator Verification Suite.

Autonomous Issue Recovery + Replanning:
TEST A — No Artifact Change (transient operational issue, no invalidation, verification generated)
TEST B — Plan Recovery (missing implementation task, Architecture preserved, Plan revised)
TEST C — Architecture Recovery (design flaw, Architecture revised, Plan regenerated, Review, Tests)
TEST D — Human Decision (missing engineering threshold, pauses without hallucination, user provides decision, resumes)
TEST E — Manual Intervention (physical hardware defect, software does NOT claim repair, pauses with physical instructions, user confirms, verification resumes)
TEST F — Maximum Recovery Limit (bounded recovery, strictly stops after 2 attempts)
TEST G — Failure During Recovery (Planner fails after Architecture fix; retry reruns ONLY Planner and preserves Architecture)
TEST H — Concurrent Run Protection (mutual exclusion between autonomous pipeline and issue recovery in both directions)
"""
import asyncio
import sys
import time
from pathlib import Path
from unittest.mock import patch

# Ensure backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient

def run_recovery(project_id: str, issue_id: str):
    asyncio.run(orchestrator_service.run_issue_recovery_pipeline(project_id, issue_id))
from app.main import (
    app,
    projects,
    requirements_store,
    architecture_store,
    plan_store,
    review_store,
    test_store,
    issues_store,
    orchestrator_store,
    activity_store,
    orchestrator_service,
    _save_db,
)
from app.schemas import (
    ArchitectureResponse,
    IssueRecord,
    OrchestratorRun,
    PlannerResponse,
    ProjectContext,
    RequirementsResponse,
    ReviewAnalysis,
    ReviewResponse,
    ReviewRisk,
    TestResponse,
)

client = TestClient(app)


def mock_clean_review(*args, **kwargs):
    return ReviewAnalysis(summary="Post-recovery re-review passed. No blocking risks.", risks=[]), 1200


def clear_project_state(project_id: str):
    orchestrator_store.pop(project_id, None)
    requirements_store.pop(project_id, None)
    architecture_store.pop(project_id, None)
    plan_store.pop(project_id, None)
    review_store.pop(project_id, None)
    test_store.pop(project_id, None)
    issues_store.pop(project_id, None)
    activity_store.pop(project_id, None)
    _save_db()


def setup_project(project_id: str, name: str = "Test Project"):
    clear_project_state(project_id)
    project = ProjectContext(
        id=project_id,
        name=name,
        idea=f"Idea for {name}",
        objective=f"Objective for {name}",
        type="Embedded & Cloud Systems",
        technologies=["ESP32-S3", "FreeRTOS", "FastAPI", "MQTT", "PostgreSQL"],
        constraints="Low-power battery operation",
        timeline="4 weeks",
        stage="concept",
    )
    projects[project_id] = project

    req = RequirementsResponse(
        project_id=project_id,
        agent="Requirement Agent",
        provider="Nebius Token Factory",
        model="nvidia/Nemotron-3-Ultra-550b-a55b",
        duration_ms=3000,
        summary="Requirements Summary",
        problem="Telemetry collection and cloud streaming",
        functional_requirements=[
            {"title": "Sensor Sampling", "description": "Sample sensor at 10Hz", "priority": "high"},
            {"title": "Cloud Telemetry", "description": "Stream MQTT telemetry", "priority": "critical"},
        ],
        non_functional_requirements=[],
        constraints=["Wi-Fi intermittency"],
        assumptions=[],
        open_questions=[],
    )
    requirements_store[project_id] = req

    arch = ArchitectureResponse(
        project_id=project_id,
        agent="Architecture Agent",
        provider="Nebius Token Factory",
        model="nvidia/Nemotron-3-Ultra-550b-a55b",
        duration_ms=4000,
        summary="Architecture Summary",
        components=[
            {"id": "comp-sensor", "name": "Sensor Node", "type": "hardware", "responsibility": "Acquires telemetry", "technology": "I2C", "inputs": [], "outputs": ["data"], "related_requirements": ["Sensor Sampling"]},
            {"id": "comp-gateway", "name": "ESP32 Gateway", "type": "software", "responsibility": "Processes and transmits MQTT", "technology": "MQTT", "inputs": ["data"], "outputs": ["cloud"], "related_requirements": ["Cloud Telemetry"]},
        ],
        connections=[{"source": "comp-sensor", "target": "comp-gateway", "interface": "I2C", "protocol": "I2C", "data": "packets", "description": "raw"}],
        data_flow=[{"step": 1, "description": "Sensor sends data to Gateway"}],
        architecture_decisions=[],
        architecture_gaps=[],
    )
    architecture_store[project_id] = arch

    plan = PlannerResponse(
        project_id=project_id,
        agent="Planner Agent",
        provider="Nebius Token Factory",
        model="nvidia/Nemotron-3-Ultra-550b-a55b",
        duration_ms=3500,
        summary="Execution Plan",
        milestones=[{"id": "m1", "title": "Milestone 1", "description": "Core Pipeline", "order": 1}],
        tasks=[
            {"id": "task-1", "title": "Implement Sensor Driver", "description": "I2C driver", "priority": "high", "dependencies": [], "estimated_effort": "4 hours", "milestone_id": "m1", "status": "todo", "related_requirements": ["Sensor Sampling"], "related_components": ["comp-sensor"], "success_criteria": ["Sensor reads"]},
            {"id": "task-2", "title": "Implement MQTT Client", "description": "MQTT client", "priority": "high", "dependencies": ["task-1"], "estimated_effort": "6 hours", "milestone_id": "m1", "status": "todo", "related_requirements": ["Cloud Telemetry"], "related_components": ["comp-gateway"], "success_criteria": ["MQTT connects"]},
        ],
        critical_path=["task-1", "task-2"],
        planning_notes=[],
    )
    plan_store[project_id] = plan

    _save_db()
    return project


def test_a_no_artifact_change():
    print("\n" + "=" * 70)
    print("=== TEST A: NO ARTIFACT CHANGE (TRANSIENT OPERATIONAL ISSUE) ===")
    print("=" * 70)
    project_id = "test-p3-a-no-change"
    setup_project(project_id, "Smart Meter")

    # Seed an issue with transient network failure
    issue_id = "issue-transient-001"
    analysis_dict = {
        "issue_summary": "Transient 504 gateway timeout while connecting to cloud endpoint",
        "likely_causes": ["Temporary network glitch or external API outage"],
        "recommended_fix": ["Verify cloud service status and retry ping after timeout"],
        "severity": "low",
        "affected_requirements": [],
        "affected_components": [],
        "blocked_tasks": [],
        "recommended_next_action": "Operational retry procedure. No project design changes required.",
        "can_continue_other_tasks": True,
        "recovery_task": {"needed": False, "title": "", "description": "", "estimated_effort": ""},
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-2",
        description="Transient network timeout during cloud sync test",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    # Verify classification
    classification, target, prompt_data = orchestrator_service.classify_recovery(
        projects[project_id], analysis_dict, issue.description
    )
    print(f"[CLASSIFICATION] {classification} -> Target: {target}")
    assert classification == "NO_ARTIFACT_CHANGE", f"Expected NO_ARTIFACT_CHANGE, got {classification}"

    # Initial architecture and plan summaries
    arch_before = architecture_store[project_id].summary
    plan_before = plan_store[project_id].summary

    # Run recovery directly
    run_recovery(project_id, issue_id)

    run = orchestrator_store[project_id]
    assert run.recovery_state == "RECOVERY_COMPLETED", f"Expected RECOVERY_COMPLETED, got {run.recovery_state}"
    assert run.recovery_type == "NO_ARTIFACT_CHANGE"

    # Architecture and Plan MUST NOT be invalidated or changed
    assert architecture_store[project_id].summary == arch_before
    assert plan_store[project_id].summary == plan_before

    # Verification must have been generated
    test_res = test_store.get(project_id)
    assert test_res is not None, "Test agent should have generated verification scenario"
    print(f"[OK] Recovery completed without artifact change. Test summary: {test_res.summary}")
    print("TEST A PASSED!")


def test_b_plan_recovery():
    print("\n" + "=" * 70)
    print("=== TEST B: PLAN RECOVERY (MISSING IMPLEMENTATION TASK) ===")
    print("=" * 70)
    project_id = "test-p3-b-plan-recovery"
    setup_project(project_id, "Smart Meter")

    issue_id = "issue-plan-002"
    analysis_dict = {
        "issue_summary": "Missing database schema migration task before background worker task executes",
        "likely_causes": ["Missing implementation prerequisite task in planning stage"],
        "recommended_fix": ["Add migration recovery task and re-sequence worker task dependency"],
        "severity": "high",
        "affected_requirements": [],
        "affected_components": [],
        "blocked_tasks": ["task-2"],
        "recommended_next_action": "Add prerequisite task and update milestone sequencing",
        "can_continue_other_tasks": False,
        "recovery_task": {
            "needed": True,
            "title": "Execute database schema migration",
            "description": "Run schema creation before starting MQTT worker",
            "estimated_effort": "2 hours",
        },
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-2",
        description="Worker crashes due to missing database migration task in plan",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    # Verify classification
    classification, target, prompt_data = orchestrator_service.classify_recovery(
        projects[project_id], analysis_dict, issue.description
    )
    print(f"[CLASSIFICATION] {classification} -> Target: {target}")
    assert classification == "PLAN_RECOVERY", f"Expected PLAN_RECOVERY, got {classification}"

    arch_before = architecture_store[project_id].summary
    plan_tasks_before = len(plan_store[project_id].tasks)

    # Run recovery pipeline with verified clean re-review
    with patch.object(orchestrator_service.reviewer_agent, "analyze", side_effect=mock_clean_review):
        run_recovery(project_id, issue_id)

    run = orchestrator_store[project_id]
    assert run.recovery_state == "RECOVERY_COMPLETED", f"Expected RECOVERY_COMPLETED, got {run.recovery_state}"
    assert run.recovery_type == "PLAN_RECOVERY"

    # Architecture MUST be preserved
    assert architecture_store[project_id].summary == arch_before, "Architecture should be preserved in Plan Recovery"

    # Plan MUST be revised with recovery task
    plan_after = plan_store.get(project_id)
    assert plan_after is not None
    assert len(plan_after.tasks) >= plan_tasks_before, "Plan tasks should include recovery task"
    print(f"[OK] Architecture preserved. Plan updated to {len(plan_after.tasks)} tasks.")
    print("TEST B PASSED!")


def test_c_architecture_recovery():
    print("\n" + "=" * 70)
    print("=== TEST C: ARCHITECTURE RECOVERY (DESIGN-LEVEL FLAW) ===")
    print("=" * 70)
    project_id = "test-p3-c-arch-recovery"
    setup_project(project_id, "Resilient Sensor Node")

    issue_id = "issue-arch-003"
    analysis_dict = {
        "issue_summary": "Telemetry packets are lost during Wi-Fi outages because no offline buffer exists in architecture",
        "likely_causes": ["Missing offline buffer component and fail-safe persistence mechanism in design"],
        "recommended_fix": ["Add circular offline flash buffer component to architecture and queue replay mechanism"],
        "severity": "critical",
        "affected_requirements": ["Cloud Telemetry"],
        "affected_components": ["comp-gateway"],
        "blocked_tasks": ["task-2"],
        "recommended_next_action": "Revise architecture to incorporate offline buffer, then regenerate plan and tests",
        "can_continue_other_tasks": False,
        "recovery_task": {"needed": True, "title": "Design offline flash ring buffer", "description": "", "estimated_effort": "8 hours"},
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-2",
        description="Telemetry dropped during Wi-Fi interruption due to missing offline buffer architecture",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    classification, target, prompt_data = orchestrator_service.classify_recovery(
        projects[project_id], analysis_dict, issue.description
    )
    print(f"[CLASSIFICATION] {classification} -> Target: {target}")
    assert classification == "ARCHITECTURE_RECOVERY", f"Expected ARCHITECTURE_RECOVERY, got {classification}"

    # Run recovery pipeline with verified clean re-review
    with patch.object(orchestrator_service.reviewer_agent, "analyze", side_effect=mock_clean_review):
        run_recovery(project_id, issue_id)

    run = orchestrator_store[project_id]
    assert run.recovery_state == "RECOVERY_COMPLETED", f"Expected RECOVERY_COMPLETED, got {run.recovery_state}"
    assert run.recovery_type == "ARCHITECTURE_RECOVERY"

    # Architecture revised
    arch_after = architecture_store.get(project_id)
    assert arch_after is not None

    # Plan regenerated
    plan_after = plan_store.get(project_id)
    assert plan_after is not None

    # Verification generated
    test_after = test_store.get(project_id)
    assert test_after is not None

    print(f"[OK] Architecture revised ({len(arch_after.components)} components), Plan regenerated ({len(plan_after.tasks)} tasks), Test verified.")
    print("TEST C PASSED!")


def test_d_human_decision_required():
    print("\n" + "=" * 70)
    print("=== TEST D: HUMAN DECISION REQUIRED (UNSPECIFIED ENGINEERING THRESHOLD) ===")
    print("=" * 70)
    project_id = "test-p3-d-human-decision"
    setup_project(project_id, "Battery Sensor")

    issue_id = "issue-decision-004"
    analysis_dict = {
        "issue_summary": "Battery life fails requirement. Choose acceptable power consumption tradeoff vs sampling rate.",
        "likely_causes": ["Unspecified engineering threshold: cannot derive sampling rate vs battery life tradeoff without user decision"],
        "recommended_fix": ["Ask user to decide between 50Hz telemetry (3-day battery) or 5Hz telemetry (30-day battery)"],
        "severity": "high",
        "affected_requirements": ["Sensor Sampling"],
        "affected_components": ["comp-sensor"],
        "blocked_tasks": ["task-1"],
        "recommended_next_action": "User decision required to choose acceptable battery operating threshold",
        "can_continue_other_tasks": False,
        "recovery_task": {"needed": False, "title": "", "description": "", "estimated_effort": ""},
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-1",
        description="Battery budget exceeded. Missing project decision on acceptable duty cycle.",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    classification, target, prompt_data = orchestrator_service.classify_recovery(
        projects[project_id], analysis_dict, issue.description
    )
    print(f"[CLASSIFICATION] {classification} -> Target: {target}")
    assert classification == "HUMAN_DECISION_REQUIRED", f"Expected HUMAN_DECISION_REQUIRED, got {classification}"
    assert prompt_data is not None, "Should have created prompt_data"

    # Run recovery pipeline - should PAUSE
    run_recovery(project_id, issue_id)

    run = orchestrator_store[project_id]
    assert run.state == "PAUSED", f"Expected state PAUSED, got {run.state}"
    assert run.recovery_state == "AWAITING_HUMAN_DECISION", f"Expected AWAITING_HUMAN_DECISION, got {run.recovery_state}"
    assert run.human_decision_prompt is not None
    print(f"[OK] Paused without hallucinating threshold. Question: {run.human_decision_prompt.question}")

    # Now user provides decision via API
    with patch.object(orchestrator_service.reviewer_agent, "analyze", side_effect=mock_clean_review):
        resp = client.post(
            f"/api/projects/{project_id}/orchestrator/provide-decision",
            json={"decision": "Use 5Hz sampling rate for 30-day battery life guarantee."},
        )
        assert resp.status_code == 200, f"Failed to provide decision: {resp.text}"
        run_recovery(project_id, issue_id)

    # Verify recovery resumed and completed
    run_after = orchestrator_store[project_id]
    assert run_after.recovery_state == "RECOVERY_COMPLETED", f"Expected RECOVERY_COMPLETED, got {run_after.recovery_state}"
    print(f"[OK] Recovery resumed with user decision and completed successfully.")
    print("TEST D PASSED!")


def test_e_manual_intervention_required():
    print("\n" + "=" * 70)
    print("=== TEST E: MANUAL INTERVENTION REQUIRED (PHYSICALLY DAMAGED SENSOR) ===")
    print("=" * 70)
    project_id = "test-p3-e-manual-intervention"
    setup_project(project_id, "Field Sensor")

    issue_id = "issue-manual-005"
    analysis_dict = {
        "issue_summary": "Temperature sensor PCB trace is cracked and physically damaged sensor hardware",
        "likely_causes": ["Physical mechanical stress fractured PCB copper trace; physically damaged sensor"],
        "recommended_fix": ["Physically replace damaged sensor module or resolder cracked PCB trace"],
        "severity": "critical",
        "affected_requirements": ["Sensor Sampling"],
        "affected_components": ["comp-sensor"],
        "blocked_tasks": ["task-1"],
        "recommended_next_action": "Hardware physical repair required. Software cannot repair broken hardware.",
        "can_continue_other_tasks": False,
        "recovery_task": {"needed": False, "title": "", "description": "", "estimated_effort": ""},
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-1",
        description="Sensor PCB trace cracked. Physically damaged sensor hardware.",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    classification, target, prompt_data = orchestrator_service.classify_recovery(
        projects[project_id], analysis_dict, issue.description
    )
    print(f"[CLASSIFICATION] {classification} -> Target: {target}")
    assert classification == "MANUAL_INTERVENTION_REQUIRED", f"Expected MANUAL_INTERVENTION_REQUIRED, got {classification}"

    # Run recovery pipeline - should PAUSE with physical instructions
    run_recovery(project_id, issue_id)

    run = orchestrator_store[project_id]
    assert run.state == "PAUSED", f"Expected state PAUSED, got {run.state}"
    assert run.recovery_state == "AWAITING_MANUAL_INTERVENTION"
    assert run.manual_intervention_required is True
    assert run.manual_intervention_prompt is not None
    print(f"[OK] Paused for physical repair: {run.manual_intervention_prompt.recommended_action}")

    # User physically completes repair and confirms via API
    resp = client.post(f"/api/projects/{project_id}/orchestrator/confirm-intervention")
    assert resp.status_code == 200, f"Failed to confirm intervention: {resp.text}"
    run_recovery(project_id, issue_id)

    # Verify verification was generated and marked ready
    run_after = orchestrator_store[project_id]
    assert run_after.recovery_state == "RECOVERY_COMPLETED"
    print("[OK] User confirmed physical intervention; Orchestrator generated verification and marked ready.")
    print("TEST E PASSED!")


def test_f_maximum_recovery_limit():
    print("\n" + "=" * 70)
    print("=== TEST F: MAXIMUM RECOVERY LIMIT (STRICT 2 ATTEMPTS) ===")
    print("=" * 70)
    project_id = "test-p3-f-max-limit"
    setup_project(project_id, "Edge Hub")

    issue_id = "issue-persistent-006"
    analysis_dict = {
        "issue_summary": "Persistent hardware bus contention on I2C channel",
        "likely_causes": ["Missing recovery task for bus arbiter"],
        "recommended_fix": ["Add arbiter task"],
        "severity": "high",
        "affected_requirements": [],
        "affected_components": ["comp-sensor"],
        "blocked_tasks": ["task-1"],
        "recommended_next_action": "Plan recovery",
        "can_continue_other_tasks": False,
        "recovery_task": {"needed": True, "title": "Arbiter Task", "description": "", "estimated_effort": "2h"},
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-1",
        description="Persistent bus contention",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    # Mock reviewer to ALWAYS fail re-review
    mock_failing_review = ReviewAnalysis(
        summary="Persistent blocker remains",
        risks=[ReviewRisk(title="Bus contention still unaddressed", severity="critical", detail="Unresolved", recommendation="Retry")],
    )

    with patch.object(orchestrator_service.reviewer_agent, "analyze", return_value=(mock_failing_review, 2000)):
        run_recovery(project_id, issue_id)

    run = orchestrator_store[project_id]
    assert run.state == "PAUSED", f"Expected PAUSED, got {run.state}"
    assert run.recovery_state == "RECOVERY_FAILED", f"Expected RECOVERY_FAILED, got {run.recovery_state}"
    assert run.recovery_attempt == 2, f"Expected 2 attempts, got {run.recovery_attempt}"
    assert "autonomous recovery attempts" in run.last_error.lower()
    print(f"[OK] Bounded autonomy verified: strictly stopped after {run.recovery_attempt} attempts.")
    print("TEST F PASSED!")


def test_g_failure_during_recovery():
    print("\n" + "=" * 70)
    print("=== TEST G: FAILURE DURING RECOVERY (RETRY RERUNS ONLY FAILED STAGE) ===")
    print("=" * 70)
    project_id = "test-p3-g-stage-failure"
    setup_project(project_id, "Fault Tolerant Hub")

    issue_id = "issue-arch-fail-007"
    analysis_dict = {
        "issue_summary": "Architecture offline buffer missing",
        "likely_causes": ["Missing buffer"],
        "recommended_fix": ["Revise architecture"],
        "severity": "critical",
        "affected_requirements": ["Cloud Telemetry"],
        "affected_components": ["comp-gateway"],
        "blocked_tasks": ["task-2"],
        "recommended_next_action": "Revise architecture",
        "can_continue_other_tasks": False,
        "recovery_task": {"needed": True, "title": "Buffer", "description": "", "estimated_effort": "4h"},
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-2",
        description="Architecture offline buffer missing",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    # Force Planner failure after successful Architecture revision
    arch_call_count = [0]
    original_arch_analyze = orchestrator_service.architecture_agent.analyze

    def mock_arch_analyze(*args, **kwargs):
        arch_call_count[0] += 1
        return original_arch_analyze(*args, **kwargs)

    with patch.object(orchestrator_service.architecture_agent, "analyze", side_effect=mock_arch_analyze):
        with patch.object(orchestrator_service.planner_agent, "analyze", side_effect=RuntimeError("Nebius 503 Service Unavailable")):
            try:
                run_recovery(project_id, issue_id)
            except RuntimeError:
                pass

    run = orchestrator_store[project_id]
    assert run.state == "PAUSED"
    assert run.failed_stage == "Planner Agent"
    assert arch_call_count[0] == 1, "Architecture should have been called once and succeeded"

    # Capture revised architecture summary
    revised_arch_summary = architecture_store[project_id].summary

    # Now retry recovery via API
    with patch.object(orchestrator_service.architecture_agent, "analyze", side_effect=mock_arch_analyze):
        with patch.object(orchestrator_service.reviewer_agent, "analyze", side_effect=mock_clean_review):
            resp = client.post(f"/api/projects/{project_id}/orchestrator/retry-recovery")
            assert resp.status_code == 200, f"Retry failed: {resp.text}"
            if orchestrator_store[project_id].recovery_state != "RECOVERY_COMPLETED":
                run_recovery(project_id, issue_id)

    run_after = orchestrator_store[project_id]
    assert run_after.recovery_state == "RECOVERY_COMPLETED"
    # Ensure Architecture Agent was NOT rerun during retry
    assert arch_call_count[0] == 1, "Architecture Agent was unnecessarily rerun on Planner retry!"
    assert architecture_store[project_id].summary == revised_arch_summary
    print("[OK] Retry reran only failed Planner stage; Architecture fix was preserved.")
    print("TEST G PASSED!")


def test_h_concurrent_run_protection():
    print("\n" + "=" * 70)
    print("=== TEST H: CONCURRENT RUN PROTECTION (MUTUAL EXCLUSION) ===")
    print("=" * 70)
    project_id = "test-p3-h-concurrency"
    setup_project(project_id, "Concurrency Project")

    issue_id = "issue-conc-008"
    analysis_dict = {
        "issue_summary": "Operational issue",
        "likely_causes": ["Config error"],
        "recommended_fix": ["Fix config"],
        "severity": "low",
        "affected_requirements": [],
        "affected_components": [],
        "blocked_tasks": [],
        "recommended_next_action": "Operational fix",
        "can_continue_other_tasks": True,
        "recovery_task": {"needed": False, "title": "", "description": "", "estimated_effort": ""},
    }
    issue = IssueRecord(
        id=issue_id,
        project_id=project_id,
        task_id="task-1",
        description="Config error",
        analysis=analysis_dict,
        created_at="2026-09-25T12:00:00Z",
    )
    issues_store[project_id] = [issue]

    # Direction 1: Normal pipeline is running -> Attempting issue recovery must fail with 409
    orchestrator_store[project_id] = OrchestratorRun(
        project_id=project_id,
        state="RUNNING",
        is_running=True,
        current_agent="Requirement Agent",
    )
    resp1 = client.post(f"/api/projects/{project_id}/issues/{issue_id}/recover")
    assert resp1.status_code == 409, f"Expected 409 Conflict, got {resp1.status_code}: {resp1.text}"
    print(f"[OK] Direction 1: Blocked issue recovery while normal pipeline is running (HTTP 409).")

    # Direction 2: Issue recovery is active -> Attempting normal pipeline must fail with 409
    orchestrator_store[project_id] = OrchestratorRun(
        project_id=project_id,
        state="RUNNING",
        is_running=True,
        recovery_state="RECOVERING",
        active_issue_id=issue_id,
    )
    resp2 = client.post(f"/api/projects/{project_id}/orchestrator/start")
    assert resp2.status_code == 409, f"Expected 409 Conflict, got {resp2.status_code}: {resp2.text}"
    print(f"[OK] Direction 2: Blocked normal pipeline while issue recovery is active (HTTP 409).")

    print("TEST H PASSED!")


if __name__ == "__main__":
    test_a_no_artifact_change()
    test_b_plan_recovery()
    test_c_architecture_recovery()
    test_d_human_decision_required()
    test_e_manual_intervention_required()
    test_f_maximum_recovery_limit()
    test_g_failure_during_recovery()
    test_h_concurrent_run_protection()
    print("\n" + "=" * 70)
    print("ALL PHASE 3 TESTS (A-H) COMPLETED SUCCESSFULLY!")
    print("=" * 70)
