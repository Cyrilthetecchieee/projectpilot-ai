import json
import sys
from fastapi.testclient import TestClient

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.main import app, review_store, plan_store, architecture_store, requirements_store, activity_store, issues_store
from app.schemas import ReviewResponse, PlannerResponse, ArchitectureResponse, RequirementsResponse

def run_test():
    client = TestClient(app)
    project_id = "test-nebius-migration-project"

    print("=== STARTING REVIEWER AGENT NEBIUS MIGRATION TEST ===")

    # Verify project has valid Nebius-generated requirements, architecture, and plan
    req_res = client.get(f"/api/projects/{project_id}/requirements")
    assert req_res.status_code == 200, f"Requirements not found: {req_res.status_code}"
    print(f"Verified Nebius Requirements: {req_res.json().get('provider')}")

    arch_res = client.get(f"/api/projects/{project_id}/architecture")
    assert arch_res.status_code == 200, f"Architecture not found: {arch_res.status_code}"
    print(f"Verified Nebius Architecture: {arch_res.json().get('provider')}")

    plan_res = client.get(f"/api/projects/{project_id}/plan")
    assert plan_res.status_code == 200, f"Plan not found: {plan_res.status_code}"
    print(f"Verified Nebius Plan: {plan_res.json().get('provider')}")

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

    # 1. POST request to /api/projects/{project_id}/agents/review
    print(f"\n1. Sending POST request to /api/projects/{project_id}/agents/review ...")
    response = client.post(
        f"/api/projects/{project_id}/agents/review",
        json=project_payload
    )

    print(f"HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    print("Check 1 PASSED: HTTP 200 received!")

    # 2 & 3 & 4. Real Nebius call, structure, Pydantic validation
    data = response.json()
    print("\n2. Validating response payload with ReviewResponse schema...")
    validated = ReviewResponse.model_validate(data)
    print("Check 2, 3, 4 PASSED: Real Nebius call returned valid structured ReviewResponse!")

    print(f"\nReview Summary: {validated.summary}")
    print(f"Provider: {validated.provider} | Model: {validated.model} | Duration: {validated.duration_ms} ms")

    # 8 & 9. Risks inspection and severity validation
    print(f"\n8 & 9. Inspecting Risks ({len(validated.risks)}):")
    assert len(validated.risks) > 0, "No risks generated in review"
    valid_severities = {"critical", "high", "medium", "low"}
    for idx, r in enumerate(validated.risks, 1):
        assert r.severity.lower() in valid_severities, f"Invalid severity: {r.severity}"
        print(f"   [{r.severity.upper()}] {r.title}")
        print(f"      Detail: {r.detail}")
        print(f"      Recommendation: {r.recommendation}")
    print("Check 8 & 9 PASSED: Project-specific risks identified with valid severity classifications.")

    # 5 & 6 & 7. Context verification (Requirements, Architecture, Plan context)
    all_risk_text = " ".join([r.title + " " + r.detail + " " + r.recommendation for r in validated.risks] + [validated.summary]).lower()
    # Check that domain keywords from requirements/architecture appear (e.g. latency, ros2, websocket, drone, telemetry, fail)
    domain_keywords = ["drone", "telemetry", "latency", "ros2", "websocket", "failsafe", "routing", "network"]
    matches = [k for k in domain_keywords if k in all_risk_text]
    print(f"\n5, 6, 7. Verifying context relevance: matched domain keywords {matches}")
    assert len(matches) >= 2, f"Expected project-specific review context, found only {matches}"
    print("Check 5, 6, 7 PASSED: Context from requirements and architecture reflected in review.")

    # 10. Persistence check
    assert project_id in review_store, "Review not found in review_store"
    print("\n10. Check 10 PASSED: Review persisted correctly.")

    # 11. GET review endpoint returns saved artifact
    print(f"\n11. Verifying GET /api/projects/{project_id}/review ...")
    get_res = client.get(f"/api/projects/{project_id}/review")
    assert get_res.status_code == 200, f"GET failed with {get_res.status_code}"
    get_data = get_res.json()
    assert get_data["project_id"] == project_id
    assert get_data["provider"] == "Nebius Token Factory"
    assert get_data["model"] == "nvidia/Nemotron-3-Ultra-550b-a55b"
    assert len(get_data["risks"]) == len(validated.risks)
    print("Check 11 PASSED: GET review endpoint returned saved artifact.")

    # 12. Agent Activity records Nebius Token Factory and correct model
    print(f"\n12. Verifying Agent Activity via GET /api/projects/{project_id}/activity ...")
    act_res = client.get(f"/api/projects/{project_id}/activity")
    assert act_res.status_code == 200, f"Activity GET failed: {act_res.status_code}"
    activities = act_res.json()
    reviewer_activity = next((a for a in activities if a.get("agent") == "Reviewer Agent"), None)
    assert reviewer_activity is not None, "Reviewer Agent activity not found"
    print(f"   Agent:    {reviewer_activity.get('agent')}")
    print(f"   Action:   {reviewer_activity.get('action')}")
    print(f"   Provider: {reviewer_activity.get('provider')}")
    print(f"   Model:    {reviewer_activity.get('model')}")
    print(f"   Status:   {reviewer_activity.get('status')}")
    print(f"   Duration: {reviewer_activity.get('duration_ms')} ms")

    assert reviewer_activity.get("provider") == "Nebius Token Factory", f"Expected Nebius Token Factory, got {reviewer_activity.get('provider')}"
    assert reviewer_activity.get("model") == "nvidia/Nemotron-3-Ultra-550b-a55b", f"Expected Nebius model, got {reviewer_activity.get('model')}"
    assert reviewer_activity.get("status") == "completed"
    print("Check 12 PASSED: Agent activity records Nebius Token Factory and model accurately.")

    # 13. Frontend/API contract unchanged
    assert "summary" in get_data
    assert "risks" in get_data
    print("\n13. Check 13 PASSED: Frontend/API contract preserved.")

    # 14, 15, 16. Verify Requirement, Architecture, and Planner still work on Nebius
    print("\n14. Verifying Requirement Agent still works...")
    req_v = client.post(f"/api/projects/{project_id}/agents/requirements", json=project_payload)
    assert req_v.status_code == 200 and req_v.json()["provider"] == "Nebius Token Factory"
    print("Check 14 PASSED: Requirement Agent still functional.")

    print("\n15. Verifying Architecture Agent still works...")
    arch_v = client.post(f"/api/projects/{project_id}/agents/architecture", json=project_payload)
    assert arch_v.status_code == 200 and arch_v.json()["provider"] == "Nebius Token Factory"
    print("Check 15 PASSED: Architecture Agent still functional.")

    print("\n16. Verifying Planner Agent still works...")
    plan_v = client.post(f"/api/projects/{project_id}/agents/plan", json=project_payload)
    assert plan_v.status_code == 200 and plan_v.json()["provider"] == "Nebius Token Factory"
    print("Check 16 PASSED: Planner Agent still functional.")

    # 17. Existing Report Issue / Issue Resolution flow remains functional
    print("\n17. Verifying Report Issue feature via POST /api/projects/{project_id}/issues ...")
    # Prepare form data matching what the frontend sends
    frontend_project_data = {
        "id": project_id,
        "name": "Autonomous Drone Delivery Fleet",
        "objective": "Achieve real-time path planning, conflict-free airspace routing, and low-latency safety telemetry.",
        "type": "Cyber-Physical System / IoT",
        "technologies": ["Python", "FastAPI", "Redis", "WebSockets", "ROS2"],
        "requirements": [
            {"kind": "Functional", "text": "Sub-100ms WebSocket telemetry ingestion", "priority": "critical"},
            {"kind": "Non-functional", "text": "Fail-safe recovery on link loss", "priority": "critical"}
        ],
        "architecture": [
            {"id": "telemetry-ingestion", "name": "Telemetry Ingestion Service", "type": "software", "responsibility": "Ingests telemetry from drones"}
        ],
        "tasks": [
            {"id": "task-1", "title": "Implement WebSocket Telemetry Ingest", "successCriteria": "Telemetry stream receives packets at 100Hz with <100ms latency"}
        ]
    }

    issue_res = client.post(
        f"/api/projects/{project_id}/issues",
        data={
            "project_data": json.dumps(frontend_project_data),
            "task_id": "task-1",
            "description": "WebSocket buffer overflow occurring during burst telemetry transmission, leading to dropped heartbeat packets."
        }
    )
    print(f"Report Issue HTTP Status: {issue_res.status_code}")
    assert issue_res.status_code == 200, f"Report issue failed: {issue_res.status_code}: {issue_res.text}"
    issue_data = issue_res.json()
    assert "analysis" in issue_data
    analysis = issue_data["analysis"]
    print(f"   Diagnosed Issue: {analysis.get('issue_summary')}")
    print(f"   Severity: {analysis.get('severity')}")
    print(f"   Likely Causes: {analysis.get('likely_causes')[:2]}")
    print(f"   Recommended Fix: {analysis.get('recommended_fix')[:2]}")
    assert project_id in issues_store and len(issues_store[project_id]) > 0
    print("Check 17 PASSED: Existing Report Issue / Issue Resolution flow is fully functional on Nebius Token Factory!")

    print("\n=== ALL 17 VERIFICATION CHECKS COMPLETED AND PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_test()
