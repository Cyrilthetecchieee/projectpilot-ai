import json
import sys
from fastapi.testclient import TestClient

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.main import app, requirements_store, activity_store
from app.schemas import RequirementsResponse

def run_test():
    client = TestClient(app)
    
    project_id = "test-nebius-migration-project"
    payload = {
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

    print(f"1. Sending POST request to /api/projects/{project_id}/agents/requirements ...")
    response = client.post(
        f"/api/projects/{project_id}/agents/requirements",
        json=payload
    )

    print(f"HTTP Status: {response.status_code}")
    if response.status_code != 200:
        print(f"Error detail: {response.text}")
        sys.exit(1)

    data = response.json()
    print("HTTP Request succeeded!")

    print("\n2. Validating Response Payload with Pydantic RequirementsResponse...")
    validated = RequirementsResponse.model_validate(data)
    print("Pydantic validation passed!")

    print(f"\n3. Checking Nebius Token Factory metadata:")
    print(f"   Agent:    {validated.agent}")
    print(f"   Provider: {validated.provider}")
    print(f"   Model:    {validated.model}")
    print(f"   Duration: {validated.duration_ms} ms")
    print(f"   Summary:  {validated.summary}")

    assert validated.agent == "Requirement Agent", f"Expected 'Requirement Agent', got {validated.agent}"
    assert validated.provider == "Nebius Token Factory", f"Expected 'Nebius Token Factory', got {validated.provider}"
    assert validated.model == "nvidia/Nemotron-3-Ultra-550b-a55b", f"Expected Nebius model, got {validated.model}"
    assert len(validated.functional_requirements) > 0, "No functional requirements returned"
    assert len(validated.non_functional_requirements) > 0, "No non-functional requirements returned"

    print("\n4. Structured Requirements Sample:")
    print(f"   Problem: {validated.problem}")
    print(f"   Functional ({len(validated.functional_requirements)}):")
    for req in validated.functional_requirements[:2]:
        print(f"     - [{req.priority.upper()}] {req.title}: {req.description}")
    print(f"   Non-Functional ({len(validated.non_functional_requirements)}):")
    for req in validated.non_functional_requirements[:2]:
        print(f"     - [{req.priority.upper()}] {req.title}: {req.description}")

    print("\n5. Verifying persistence via GET /api/projects/{project_id}/requirements ...")
    get_res = client.get(f"/api/projects/{project_id}/requirements")
    assert get_res.status_code == 200, f"GET failed with {get_res.status_code}"
    get_data = get_res.json()
    assert get_data["project_id"] == project_id
    assert get_data["provider"] == "Nebius Token Factory"
    assert project_id in requirements_store
    print("Requirements persisted and retrieved correctly!")

    print("\n6. Verifying Agent Activity via GET /api/projects/{project_id}/activity ...")
    act_res = client.get(f"/api/projects/{project_id}/activity")
    assert act_res.status_code == 200, f"Activity GET failed: {act_res.status_code}"
    activities = act_res.json()
    assert len(activities) > 0, "Activity log is empty"
    req_act = activities[0]
    print(f"   Activity Agent:    {req_act.get('agent')}")
    print(f"   Activity Action:   {req_act.get('action')}")
    print(f"   Activity Provider: {req_act.get('provider')}")
    print(f"   Activity Model:    {req_act.get('model')}")
    print(f"   Activity Status:   {req_act.get('status')}")
    print(f"   Activity Duration: {req_act.get('duration_ms')} ms")

    assert req_act.get("provider") == "Nebius Token Factory", f"Expected Nebius Token Factory, got {req_act.get('provider')}"
    assert req_act.get("model") == "nvidia/Nemotron-3-Ultra-550b-a55b", f"Expected Nebius model, got {req_act.get('model')}"
    assert req_act.get("status") == "completed"

    print("\n=== ALL 7 VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_test()
