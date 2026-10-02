import json
import os
import sys
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
    activity_store,
    issues_store,
)
from app.schemas import (
    RequirementsResponse,
    ArchitectureResponse,
    PlannerResponse,
    ReviewResponse,
    TestResponse,
)

client = TestClient(app)
PROJECT_ID = "agroshield-frost-guard"

def main():
    print("=" * 70)
    print("=== PROJECT-SPECIFIC OUTPUT QUALITY & PIPELINE VERIFICATION ===")
    print("=" * 70)

    project_payload = {
        "id": PROJECT_ID,
        "name": "AgroShield Autonomous Frost Protection System",
        "idea": (
            "Automated orchard frost protection system deploying distributed ESP32-C3 sensor "
            "nodes with LoRaWAN, thermal imaging micro-cameras (MLX90640), propane heating tower "
            "actuators, and a central Raspberry Pi 4 edge gateway reporting to Firebase Realtime DB "
            "and an operator React telemetry dashboard."
        ),
        "objective": (
            "Detect microclimate freezing conditions across 50-acre orchards within 30 seconds of "
            "temperature drop below 0C and automatically ignite propane heating towers via safe "
            "dual-stage relays while streaming real-time thermal maps to farm operators."
        ),
        "type": "Embedded IoT & Cloud Actuation",
        "technologies": [
            "ESP32-C3",
            "MLX90640 Thermal Sensor",
            "LoRaWAN (SX1262)",
            "Raspberry Pi 4 Edge Gateway",
            "Dual-Stage Propane Ignition Relays",
            "Firebase Realtime Database",
            "React",
            "FastAPI",
        ],
        "constraints": (
            "Low power battery/solar nodes lasting >6 months. "
            "Ignition relay fail-safe lockout to prevent gas accumulation. "
            "Telemetry latency < 15 seconds over LoRaWAN. "
            "Operation down to -20C ambient temperature."
        ),
        "timeline": "4 months",
        "stage": "Prototyping",
    }

    # -------------------------------------------------------------------------
    # 1. REQUIREMENT AGENT
    # -------------------------------------------------------------------------
    print("\n--- 1. Testing Requirement Agent (Real Nebius Call) ---")
    resp = client.post(f"/api/projects/{PROJECT_ID}/agents/requirements", json={"project": project_payload})
    assert resp.status_code == 200, f"Requirements failed with status {resp.status_code}: {resp.text}"
    req_res = resp.json()
    RequirementsResponse.model_validate(req_res)
    print(f"[OK] Requirement Agent returned HTTP 200 (Duration: {req_res.get('duration_ms')}ms)")
    print(f"Provider: {req_res.get('provider')} | Model: {req_res.get('model')}")
    print(f"Problem: {req_res.get('problem')[:120]}...")
    print(f"Functional Requirements ({len(req_res.get('functional_requirements', []))}):")
    for r in req_res.get("functional_requirements", []):
        print(f"  - [{r.get('priority')}] {r.get('title')}: {r.get('description')[:90]}...")
    
    req_text = json.dumps(req_res).lower()
    assert any(term in req_text for term in ["esp32", "lora", "thermal", "relay", "frost", "0c", "propane"]), \
        "Requirement output lacks concrete domain keywords!"
    print("Check 1 PASSED: Requirement Agent produces concrete domain requirements.")

    # -------------------------------------------------------------------------
    # 2. ARCHITECTURE AGENT
    # -------------------------------------------------------------------------
    print("\n--- 2. Testing Architecture Agent (Real Nebius Call) ---")
    resp = client.post(f"/api/projects/{PROJECT_ID}/agents/architecture", json={"project": project_payload})
    assert resp.status_code == 200, f"Architecture failed with status {resp.status_code}: {resp.text}"
    arch_res = resp.json()
    ArchitectureResponse.model_validate(arch_res)
    print(f"[OK] Architecture Agent returned HTTP 200 (Duration: {arch_res.get('duration_ms')}ms)")
    print(f"Provider: {arch_res.get('provider')} | Model: {arch_res.get('model')}")
    print(f"Components ({len(arch_res.get('components', []))}):")
    
    banned_generic_names = {"input & interface", "input and interface", "core processing", "persistence layer", "external integration", "output layer"}
    for c in arch_res.get("components", []):
        name = c.get("name")
        print(f"  - {name} ({c.get('type')}, Tech: {c.get('technology')}): {c.get('responsibility')[:80]}...")
        assert name.strip().lower() not in banned_generic_names, f"Banned generic component name found: {name}"

    connections = arch_res.get("connections", [])
    data_flow = arch_res.get("data_flow", [])
    print(f"Connections count: {len(connections)}")
    for conn in connections[:3]:
        print(f"  * {conn.get('source')} -> {conn.get('target')} via {conn.get('protocol')}: {conn.get('data')}")
    print(f"Data Flow Steps count: {len(data_flow)}")
    for df in data_flow[:3]:
        print(f"  * Step {df.get('step')}: {df.get('description')[:80]}...")

    assert len(connections) > 0, "Architecture connections must be > 0!"
    assert len(data_flow) >= 3, "Architecture data_flow steps must be >= 3!"
    print("Check 2 PASSED: Architecture Agent derived real components, explicit connections, and end-to-end data flow.")

    # -------------------------------------------------------------------------
    # 3. PLANNER AGENT
    # -------------------------------------------------------------------------
    print("\n--- 3. Testing Planner Agent (Real Nebius Call) ---")
    resp = client.post(f"/api/projects/{PROJECT_ID}/agents/plan", json={"project": project_payload})
    assert resp.status_code == 200, f"Planner failed with status {resp.status_code}: {resp.text}"
    plan_res = resp.json()
    PlannerResponse.model_validate(plan_res)
    print(f"[OK] Planner Agent returned HTTP 200 (Duration: {plan_res.get('duration_ms')}ms)")
    print(f"Provider: {plan_res.get('provider')} | Model: {plan_res.get('model')}")
    print(f"Milestones ({len(plan_res.get('milestones', []))}):")
    for m in plan_res.get("milestones", []):
        print(f"  - {m.get('id')}: {m.get('title')}")
    
    tasks = plan_res.get("tasks", [])
    print(f"Tasks count: {len(tasks)}")
    banned_tasks = {"define interfaces", "confirm success criteria", "define system interfaces", "implement core system", "validate functionality", "complete hardware", "work on backend", "do testing"}
    for t in tasks[:5]:
        title = t.get("title")
        print(f"  - [{t.get('priority')}] {t.get('id')}: {title} (Effort: {t.get('estimated_effort')})")
        print(f"    Traceability: Reqs={t.get('related_requirements')}, Comps={t.get('related_components')}")
        assert title.strip().lower() not in banned_tasks, f"Banned generic task title found: {title}"

    traceable_tasks = [t for t in tasks if t.get("related_requirements") or t.get("related_components")]
    assert len(traceable_tasks) >= len(tasks) * 0.7, "Traceability missing on majority of tasks!"
    print("Check 3 PASSED: Planner Agent generated project-specific engineering tasks with strong traceability.")

    # -------------------------------------------------------------------------
    # 4. REVIEWER AGENT
    # -------------------------------------------------------------------------
    print("\n--- 4. Testing Reviewer Agent (Real Nebius Call) ---")
    resp = client.post(f"/api/projects/{PROJECT_ID}/agents/review", json={"project": project_payload})
    assert resp.status_code == 200, f"Reviewer failed with status {resp.status_code}: {resp.text}"
    rev_res = resp.json()
    ReviewResponse.model_validate(rev_res)
    print(f"[OK] Reviewer Agent returned HTTP 200 (Duration: {rev_res.get('duration_ms')}ms)")
    print(f"Provider: {rev_res.get('provider')} | Model: {rev_res.get('model')}")
    risks = rev_res.get("risks", [])
    print(f"Identified Risks ({len(risks)}):")
    banned_risks = {"failure behavior needs an explicit decision", "integration boundary is not finalized", "missing documentation", "error handling needed"}
    for r in risks:
        title = r.get("title")
        print(f"  - [{r.get('severity')}] {title}:")
        print(f"    Detail: {r.get('detail')[:100]}...")
        print(f"    Mitigation: {r.get('recommendation')[:100]}...")
        assert title.strip().lower() not in banned_risks, f"Banned generic risk title found: {title}"

    rev_text = json.dumps(rev_res).lower()
    assert any(term in rev_text for term in ["relay", "gas", "lockout", "lora", "battery", "temp", "esp32", "frost", "gateway"]), \
        "Reviewer risks lack concrete domain context!"
    print("Check 4 PASSED: Reviewer Agent identified concrete, project-specific technical risks.")

    # -------------------------------------------------------------------------
    # 5. TEST AGENT
    # -------------------------------------------------------------------------
    print("\n--- 5. Testing Test Agent (Real Nebius Call) ---")
    resp = client.post(f"/api/projects/{PROJECT_ID}/agents/tests", json={"project": project_payload})
    assert resp.status_code == 200, f"Test Agent failed with status {resp.status_code}: {resp.text}"
    test_res = resp.json()
    TestResponse.model_validate(test_res)
    print(f"[OK] Test Agent returned HTTP 200 (Duration: {test_res.get('duration_ms')}ms)")
    print(f"Provider: {test_res.get('provider')} | Model: {test_res.get('model')}")
    test_cases = test_res.get("test_cases", [])
    print(f"Generated Test Cases ({len(test_cases)}):")
    banned_tests = {"valid primary workflow", "missing required input", "integration loss", "basic test", "error test"}
    for tc in test_cases:
        scen = tc.get("scenario")
        print(f"  - Scenario: {scen}")
        print(f"    Precondition: {tc.get('precondition')[:80]}...")
        print(f"    Expected: {tc.get('expected_result')[:80]}...")
        assert scen.strip().lower() not in banned_tests, f"Banned generic test scenario found: {scen}"

    test_text = json.dumps(test_res).lower()
    assert any(term in test_text for term in ["relay", "lora", "temp", "freeze", "esp32", "thermal", "lockout", "firebase", "sensor"]), \
        "Test cases lack concrete domain scenarios!"
    print("Check 5 PASSED: Test Agent generated project-specific verification scenarios.")

    # -------------------------------------------------------------------------
    # 6. PERSISTENCE VERIFICATION
    # -------------------------------------------------------------------------
    print("\n--- 6. Verifying Persistence Endpoints ---")
    for endpoint in ["requirements", "architecture", "plan", "review", "tests"]:
        resp = client.get(f"/api/projects/{PROJECT_ID}/{endpoint}")
        assert resp.status_code == 200, f"GET /{endpoint} failed with {resp.status_code}"
        print(f"[OK] GET /api/projects/{PROJECT_ID}/{endpoint} returned 200 OK")
    print("Check 6 PASSED: All 5 artifacts persist and are accessible via GET endpoints.")

    # -------------------------------------------------------------------------
    # 7. AGENT ACTIVITY VERIFICATION
    # -------------------------------------------------------------------------
    print("\n--- 7. Verifying Agent Activity ---")
    resp = client.get(f"/api/projects/{PROJECT_ID}/activity")
    assert resp.status_code == 200, f"GET /activity failed with {resp.status_code}"
    act_res = resp.json()
    print(f"Total Activity Records: {len(act_res)}")
    for act in act_res[:5]:
        print(f"  - Agent: {act.get('agent')} | Provider: {act.get('provider')} | Model: {act.get('model')} | Status: {act.get('status')}")
        assert act.get("provider") == "Nebius Token Factory", f"Incorrect provider: {act.get('provider')}"
        assert act.get("model") == "nvidia/Nemotron-3-Ultra-550b-a55b", f"Incorrect model: {act.get('model')}"
    print("Check 7 PASSED: Agent Activity accurately records Nebius Token Factory and model.")

    # -------------------------------------------------------------------------
    # 8. REPORT ISSUE / ISSUE RESOLUTION VERIFICATION
    # -------------------------------------------------------------------------
    print("\n--- 8. Verifying Report Issue / Issue Resolution ---")
    first_task = tasks[0] if tasks else {"id": "task-1", "title": "Setup ESP32"}
    frontend_project_data = {
        "id": PROJECT_ID,
        "name": project_payload["name"],
        "objective": project_payload["objective"],
        "type": project_payload["type"],
        "technologies": project_payload["technologies"],
        "requirements": [
            {"kind": "Functional", "text": "Sub-15s LoRaWAN frost warning telemetry", "priority": "critical"},
            {"kind": "Non-functional", "text": "Fail-safe gas lockout on ignition failure", "priority": "critical"}
        ],
        "architecture": [
            {"id": "c1", "name": "ESP32-C3 Sensor Node", "type": "hardware", "responsibility": "Acquires thermal readings"},
            {"id": "c2", "name": "Propane Tower Dual-Stage Relay", "type": "hardware", "responsibility": "Controls burner ignition"}
        ],
        "tasks": [
            {"id": first_task.get("id"), "title": first_task.get("title"), "successCriteria": "Flame sensor confirms ignition within 3 seconds"}
        ]
    }
    issue_res = client.post(
        f"/api/projects/{PROJECT_ID}/issues",
        data={
            "project_data": json.dumps(frontend_project_data),
            "task_id": first_task.get("id"),
            "description": "MLX90640 thermal sensor I2C bus hangs intermittently during sub-zero testing on ESP32-C3, preventing freeze trigger.",
        }
    )
    assert issue_res.status_code == 200, f"Issue diagnosis failed with {issue_res.status_code}: {issue_res.text}"
    diag_res = issue_res.json()
    assert "analysis" in diag_res
    analysis = diag_res["analysis"]
    print(f"[OK] Issue Diagnosis returned 200 OK:")
    print(f"  Summary: {analysis.get('issue_summary')}")
    print(f"  Severity: {analysis.get('severity')}")
    print(f"  Likely causes: {analysis.get('likely_causes')[:2]}")
    print(f"  Recommended fix: {analysis.get('recommended_fix')[:2]}")
    print("Check 8 PASSED: Report Issue / Issue Resolution flow remains fully functional on Nebius Token Factory.")

    print("\n" + "=" * 70)
    print("=== ALL PIPELINE QUALITY & REGRESSION CHECKS PASSED SUCCESSFULLY! ===")
    print("=" * 70)

if __name__ == "__main__":
    main()
