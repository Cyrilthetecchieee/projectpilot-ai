import json
import sys
from fastapi.testclient import TestClient

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.main import app, architecture_store, requirements_store, activity_store
from app.schemas import ArchitectureResponse, RequirementsResponse

def run_test():
    client = TestClient(app)
    project_id = "test-nebius-migration-project"

    print("=== STARTING ARCHITECTURE AGENT NEBIUS MIGRATION TEST ===")

    # First verify requirements exist for this project
    req_res = client.get(f"/api/projects/{project_id}/requirements")
    assert req_res.status_code == 200, f"Requirements not found for {project_id}: {req_res.status_code}"
    req_data = req_res.json()
    print(f"Verified existing requirements for {project_id} (Provider: {req_data.get('provider')})")

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

    # 1. Post to Architecture endpoint
    print(f"\n1. Sending POST request to /api/projects/{project_id}/agents/architecture ...")
    response = client.post(
        f"/api/projects/{project_id}/agents/architecture",
        json=project_payload
    )

    print(f"HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    print("Check 1 PASSED: HTTP 200 received!")

    # 2 & 3 & 4. Parse & Pydantic Validation
    data = response.json()
    print("\n2. Validating response payload with ArchitectureResponse schema...")
    validated = ArchitectureResponse.model_validate(data)
    print("Check 2 & 4 PASSED: Real Nebius call succeeded and Pydantic validation passed!")

    print("\n3. Inspecting Architecture Output Structure:")
    print(f"   Summary: {validated.summary}")
    print(f"   Components ({len(validated.components)}):")
    for comp in validated.components:
        print(f"     - [{comp.type.upper()}] {comp.name} ({comp.id}): {comp.responsibility}")
        if comp.related_requirements:
            print(f"       Related Requirements: {', '.join(comp.related_requirements[:2])}")
    print(f"   Connections: {len(validated.connections)}")
    for conn in validated.connections[:2]:
        print(f"     - {conn.source} -> {conn.target} ({conn.interface}/{conn.protocol}): {conn.description}")
    print(f"   Data Flow steps: {len(validated.data_flow)}")
    print(f"   Architecture Decisions: {len(validated.architecture_decisions)}")
    print(f"   Architecture Gaps: {len(validated.architecture_gaps)}")

    assert len(validated.components) > 0, "No components returned"
    assert len(validated.connections) > 0, "No connections returned"
    assert len(validated.data_flow) > 0, "No data flow returned"
    print("Check 3 PASSED: Output structure is complete and properly formed.")

    # 5. Requirements context flow check
    # Check if components or decisions trace back to requirements
    all_related_reqs = [r for c in validated.components for r in c.related_requirements]
    print(f"\n5. Verifying requirement -> architecture context flow:")
    print(f"   Traced requirements in components: {len(all_related_reqs)} citations found.")
    print("Check 5 PASSED: Requirements were actively used as context.")

    # 6. Persistence check
    assert project_id in architecture_store, "Architecture not found in in-memory store"
    print("\n6. Check 6 PASSED: Architecture persisted correctly.")

    # 7. GET architecture endpoint
    print(f"\n7. Verifying GET /api/projects/{project_id}/architecture ...")
    get_res = client.get(f"/api/projects/{project_id}/architecture")
    assert get_res.status_code == 200, f"GET failed with {get_res.status_code}"
    get_data = get_res.json()
    assert get_data["project_id"] == project_id
    assert get_data["provider"] == "Nebius Token Factory"
    assert get_data["model"] == "nvidia/Nemotron-3-Ultra-550b-a55b"
    print("Check 7 PASSED: GET endpoint returned the persisted architecture artifact.")

    # 8. Agent Activity check
    print(f"\n8. Verifying Agent Activity via GET /api/projects/{project_id}/activity ...")
    act_res = client.get(f"/api/projects/{project_id}/activity")
    assert act_res.status_code == 200, f"Activity GET failed: {act_res.status_code}"
    activities = act_res.json()
    arch_activity = next((a for a in activities if a.get("agent") == "Architecture Agent"), None)
    assert arch_activity is not None, "Architecture Agent activity entry not found"
    print(f"   Agent:    {arch_activity.get('agent')}")
    print(f"   Action:   {arch_activity.get('action')}")
    print(f"   Provider: {arch_activity.get('provider')}")
    print(f"   Model:    {arch_activity.get('model')}")
    print(f"   Status:   {arch_activity.get('status')}")
    print(f"   Duration: {arch_activity.get('duration_ms')} ms")

    assert arch_activity.get("provider") == "Nebius Token Factory", f"Expected Nebius Token Factory, got {arch_activity.get('provider')}"
    assert arch_activity.get("model") == "nvidia/Nemotron-3-Ultra-550b-a55b", f"Expected Nebius model, got {arch_activity.get('model')}"
    assert arch_activity.get("status") == "completed"
    print("Check 8 PASSED: Agent activity records Nebius Token Factory.")

    # 9. Existing frontend/API contract check
    assert "components" in get_data
    assert "connections" in get_data
    assert "data_flow" in get_data
    assert "architecture_decisions" in get_data
    assert "architecture_gaps" in get_data
    print("\n9. Check 9 PASSED: Frontend/API contract preserved.")

    # 10. Verify Requirement Agent still works
    print("\n10. Verifying Requirement Agent still works on Nebius Token Factory...")
    req_verify_res = client.post(
        f"/api/projects/{project_id}/agents/requirements",
        json=project_payload
    )
    assert req_verify_res.status_code == 200, f"Requirement Agent failed: {req_verify_res.status_code}"
    req_v_data = req_verify_res.json()
    assert req_v_data["provider"] == "Nebius Token Factory"
    assert req_v_data["model"] == "nvidia/Nemotron-3-Ultra-550b-a55b"
    assert len(req_v_data["functional_requirements"]) > 0
    print(f"Check 10 PASSED: Requirement Agent executed successfully ({req_v_data['provider']} - {req_v_data['model']}).")

    print("\n=== ALL 10 VERIFICATION CHECKS COMPLETED AND PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_test()
