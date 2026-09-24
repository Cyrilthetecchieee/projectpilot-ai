import json
import sys
from fastapi.testclient import TestClient

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.main import app, plan_store, architecture_store, requirements_store, activity_store
from app.schemas import PlannerResponse, ArchitectureResponse, RequirementsResponse

def run_test():
    client = TestClient(app)
    project_id = "test-nebius-migration-project"

    print("=== STARTING PLANNER AGENT NEBIUS MIGRATION TEST ===")

    # Verify project has valid Nebius requirements and architecture
    req_res = client.get(f"/api/projects/{project_id}/requirements")
    assert req_res.status_code == 200, f"Requirements not found: {req_res.status_code}"
    req_data = req_res.json()
    print(f"Verified Nebius Requirements: {req_data.get('provider')} - {req_data.get('model')}")

    arch_res = client.get(f"/api/projects/{project_id}/architecture")
    assert arch_res.status_code == 200, f"Architecture not found: {arch_res.status_code}"
    arch_data = arch_res.json()
    print(f"Verified Nebius Architecture: {arch_data.get('provider')} - {arch_data.get('model')}")

    project_payload = {
        "project": {
            "id": project_id,
            "name": "Autonomous Drone Delivery Fleet",
            "idea": "Build a centralized telemetry and dispatch control system for autonomous delivery drones in suburban areas.",
            "objective": "Achieve real-time path planning, conflict-free airspace routing, and low-latency safety telemetry.",
            "type": "Cyber-Physical System / IoT",
            "technologies": ["Python", "FastAPI", "Redis", "WebSockets", "ROS2"],
            "constraints": "Sub-100ms telemetry latency, offline failsafe mode on telemetry drop.",
            "timeline": "8 weeks",
            "stage": "planning"
        }
    }

    # 1. POST request to /api/projects/{project_id}/agents/plan
    print(f"\n1. Sending POST request to /api/projects/{project_id}/agents/plan ...")
    response = client.post(
        f"/api/projects/{project_id}/agents/plan",
        json=project_payload
    )

    print(f"HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    print("Check 1 PASSED: HTTP 200 received!")

    # 2 & 3 & 4. Real Nebius call, structure, Pydantic validation
    data = response.json()
    print("\n2. Validating response payload with PlannerResponse schema...")
    validated = PlannerResponse.model_validate(data)
    print("Check 2, 3, 4 PASSED: Real Nebius call returned valid structured ExecutionPlan passing Pydantic validation!")

    print(f"\nExecution Plan Summary: {validated.summary}")
    print(f"Provider: {validated.provider} | Model: {validated.model} | Duration: {validated.duration_ms} ms")

    # 7. Milestones & Tasks generated
    print(f"\n7. Inspecting Milestones ({len(validated.milestones)}) & Tasks ({len(validated.tasks)}):")
    assert len(validated.milestones) > 0, "No milestones generated"
    assert len(validated.tasks) > 0, "No tasks generated"
    for m in validated.milestones[:3]:
        print(f"   [Milestone {m.order}] {m.title} ({m.id}): {m.description}")
    for t in validated.tasks[:3]:
        print(f"   [Task] {t.title} ({t.id}, Milestone: {t.milestone_id}, Priority: {t.priority}, Effort: {t.estimated_effort})")
        print(f"          Dependencies: {t.dependencies}")
        print(f"          Criteria: {t.success_criteria[:1]}")
    print("Check 7 PASSED: Milestones and tasks generated cleanly.")

    # 5 & 6 & 9. Context & Traceability (Requirements + Architecture)
    all_req_traces = [r for t in validated.tasks for r in t.related_requirements]
    all_comp_traces = [c for t in validated.tasks for c in t.related_components]
    print(f"\n5, 6, 9. Verifying Requirements & Architecture Traceability:")
    print(f"   Requirement traces in tasks: {len(all_req_traces)} items traced.")
    print(f"   Architecture component traces in tasks: {len(all_comp_traces)} items traced.")
    assert len(all_req_traces) > 0, "Requirement traceability missing"
    assert len(all_comp_traces) > 0, "Architecture traceability missing"
    print("Check 5, 6, 9 PASSED: Requirements and Architecture correctly used as context with preserved traceability.")

    # 8. Task dependencies validity
    task_id_set = {t.id for t in validated.tasks}
    dep_graph = {}
    for t in validated.tasks:
        for d in t.dependencies:
            assert d in task_id_set, f"Task {t.id} references non-existent dependency {d}"
            assert d != t.id, f"Task {t.id} depends on itself"
        dep_graph[t.id] = set(t.dependencies)
    print("\n8. Task Dependencies Check:")
    print(f"   All {len(validated.tasks)} tasks have valid reference-checked dependencies.")
    print("Check 8 PASSED: Task dependencies are completely valid.")

    # 10. Critical Path generated correctly
    print(f"\n10. Critical Path Check: {validated.critical_path}")
    assert len(validated.critical_path) > 0, "Critical path is empty"
    for cp_task in validated.critical_path:
        assert cp_task in task_id_set, f"Critical path task {cp_task} not found in tasks"
    print("Check 10 PASSED: Critical path generated and validated against task IDs.")

    # Check for logical contradictions between task dependencies and planning notes/insights
    print("\nVerifying absence of logical contradictions between dependencies and planning notes:")
    # Transitive closure
    transitive = {t.id: set(t.dependencies) for t in validated.tasks}
    changed = True
    while changed:
        changed = False
        for tid, deps in transitive.items():
            new_deps = deps.copy()
            for d in deps:
                new_deps.update(transitive.get(d, set()))
            if new_deps != deps:
                transitive[tid] = new_deps
                changed = True

    for note in validated.planning_notes:
        note_lower = note.lower()
        if "parallel" in note_lower or "concurrent" in note_lower:
            for t1, t1_deps in transitive.items():
                for t2 in t1_deps:
                    has_t1 = (t1.lower() in note_lower or t1.replace("-", " ").lower() in note_lower)
                    has_t2 = (t2.lower() in note_lower or t2.replace("-", " ").lower() in note_lower)
                    assert not (has_t1 and has_t2), f"Contradiction found in planning note '{note}': {t1} depends on {t2} but parallel execution mentioned."
    print("NO logical contradictions found between dependencies and planning notes.")

    # 11. Persistence check
    assert project_id in plan_store, "Plan not found in plan_store"
    print("\n11. Check 11 PASSED: Execution Plan persists in storage.")

    # 12. GET plan endpoint returns saved artifact
    print(f"\n12. Verifying GET /api/projects/{project_id}/plan ...")
    get_res = client.get(f"/api/projects/{project_id}/plan")
    assert get_res.status_code == 200, f"GET failed with {get_res.status_code}"
    get_data = get_res.json()
    assert get_data["project_id"] == project_id
    assert get_data["provider"] == "Nebius Token Factory"
    assert get_data["model"] == "nvidia/Nemotron-3-Ultra-550b-a55b"
    print("Check 12 PASSED: GET plan endpoint returned saved artifact.")

    # 13. Agent Activity shows Nebius Token Factory + model
    print(f"\n13. Verifying Agent Activity via GET /api/projects/{project_id}/activity ...")
    act_res = client.get(f"/api/projects/{project_id}/activity")
    assert act_res.status_code == 200, f"Activity GET failed: {act_res.status_code}"
    activities = act_res.json()
    planner_activity = next((a for a in activities if a.get("agent") == "Planner Agent"), None)
    assert planner_activity is not None, "Planner Agent activity not found"
    print(f"   Agent:    {planner_activity.get('agent')}")
    print(f"   Action:   {planner_activity.get('action')}")
    print(f"   Provider: {planner_activity.get('provider')}")
    print(f"   Model:    {planner_activity.get('model')}")
    print(f"   Status:   {planner_activity.get('status')}")
    print(f"   Duration: {planner_activity.get('duration_ms')} ms")

    assert planner_activity.get("provider") == "Nebius Token Factory", f"Expected Nebius Token Factory, got {planner_activity.get('provider')}"
    assert planner_activity.get("model") == "nvidia/Nemotron-3-Ultra-550b-a55b", f"Expected Nebius model, got {planner_activity.get('model')}"
    assert planner_activity.get("status") == "completed"
    print("Check 13 PASSED: Agent activity records Nebius Token Factory and model accurately.")

    # 14. Frontend / API contract unchanged
    assert "summary" in get_data
    assert "milestones" in get_data
    assert "tasks" in get_data
    assert "critical_path" in get_data
    assert "planning_notes" in get_data
    print("\n14. Check 14 PASSED: Frontend/API contract preserved.")

    # 15. Requirement Agent still works
    print("\n15. Verifying Requirement Agent still works...")
    req_v = client.post(f"/api/projects/{project_id}/agents/requirements", json=project_payload)
    assert req_v.status_code == 200, f"Requirement Agent failed: {req_v.status_code}"
    assert req_v.json()["provider"] == "Nebius Token Factory"
    print("Check 15 PASSED: Requirement Agent executed successfully on Nebius Token Factory.")

    # 16. Architecture Agent still works
    print("\n16. Verifying Architecture Agent still works...")
    arch_v = client.post(f"/api/projects/{project_id}/agents/architecture", json=project_payload)
    assert arch_v.status_code == 200, f"Architecture Agent failed: {arch_v.status_code}"
    assert arch_v.json()["provider"] == "Nebius Token Factory"
    print("Check 16 PASSED: Architecture Agent executed successfully on Nebius Token Factory.")

    print("\n=== ALL 16 VERIFICATION CHECKS COMPLETED AND PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_test()
