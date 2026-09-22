import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://127.0.0.1:8000"

def post_json(url: str, data: dict):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return e.code, parsed

def run_tests():
    print("=== STARTING PLANNER AGENT VALIDATION TESTS ===")

    # 1. Dependency Test A: Project without requirements
    print("\n--- TEST A: Requirements Missing ---")
    status, res = post_json(
        f"{BASE_URL}/api/projects/test-dep-a/agents/plan",
        {"project": {"id": "test-dep-a", "name": "Test Missing Req"}}
    )
    print(f"Status: {status}")
    print(f"Response: {res}")
    assert status == 409, f"Expected 409, got {status}"
    code = res.get("detail", {}).get("code") if isinstance(res.get("detail"), dict) else None
    assert code == "REQUIREMENTS_REQUIRED", f"Expected REQUIREMENTS_REQUIRED, got {code}"
    print(">>> Dependency Test A PASSED: REQUIREMENTS_REQUIRED correctly returned.")

    # 2. Dependency Test B: Requirements present, but Architecture missing
    print("\n--- TEST B: Architecture Missing ---")
    # First analyze requirements for test-dep-b
    dep_b_project = {
        "id": "test-dep-b",
        "name": "Test Missing Arch",
        "idea": "An automatic window closer that activates when rain is detected.",
        "objective": "Close window automatically on rain sensor trigger.",
        "type": "IoT / Embedded",
        "technologies": ["ESP32", "Rain Sensor", "Servo"],
        "constraints": "Battery powered",
        "timeline": "2 weeks",
        "stage": "Planning"
    }
    print("Analyzing requirements for test-dep-b...")
    req_status, req_res = post_json(
        f"{BASE_URL}/api/projects/test-dep-b/agents/requirements",
        {"project": dep_b_project}
    )
    print(f"Requirements Status: {req_status}")
    assert req_status == 200, f"Expected 200 for requirements, got {req_status}"

    # Now attempt to generate plan without architecture
    status, res = post_json(
        f"{BASE_URL}/api/projects/test-dep-b/agents/plan",
        {"project": dep_b_project}
    )
    print(f"Plan Status without Architecture: {status}")
    print(f"Response: {res}")
    assert status == 409, f"Expected 409, got {status}"
    code = res.get("detail", {}).get("code") if isinstance(res.get("detail"), dict) else None
    assert code == "ARCHITECTURE_REQUIRED", f"Expected ARCHITECTURE_REQUIRED, got {code}"
    print(">>> Dependency Test B PASSED: ARCHITECTURE_REQUIRED correctly returned.")

    # 3. Test 1 — Smart Helmet
    print("\n--- TEST 1: Smart Helmet Plan Generation ---")
    smart_helmet_project = {
        "id": "smart-helmet",
        "name": "Smart Helmet Safety System",
        "idea": "A connected helmet that prevents vehicle authorization unless helmet presence and strap safety conditions are verified.",
        "objective": "Create a reliable safety interlock between a rider helmet and a vehicle controller.",
        "type": "IoT / Embedded",
        "technologies": ["ESP32", "BLE", "C++", "React"],
        "constraints": "Limited hardware access, four-week timeline, student budget.",
        "timeline": "2-3 Months",
        "stage": "Planning"
    }
    # Check if requirements and architecture are stored; if not, generate them
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/projects/smart-helmet/requirements") as resp:
            print("Smart Helmet requirements already present in store.")
    except Exception:
        print("Analyzing Smart Helmet requirements...")
        r_status, _ = post_json(f"{BASE_URL}/api/projects/smart-helmet/agents/requirements", {"project": smart_helmet_project})
        print(f"Requirements analyzed, status: {r_status}")

    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/projects/smart-helmet/architecture") as resp:
            print("Smart Helmet architecture already present in store.")
    except Exception:
        print("Generating Smart Helmet architecture...")
        a_status, _ = post_json(f"{BASE_URL}/api/projects/smart-helmet/agents/architecture", {"project": smart_helmet_project})
        print(f"Architecture generated, status: {a_status}")

    print("Invoking Planner Agent for Smart Helmet...")
    status, plan = post_json(f"{BASE_URL}/api/projects/smart-helmet/agents/plan", {"project": smart_helmet_project})
    print(f"Smart Helmet Plan HTTP Status: {status}")
    assert status == 200, f"Expected 200, got {status}"
    
    milestones = plan.get("milestones", [])
    tasks = plan.get("tasks", [])
    critical_path = plan.get("critical_path", [])
    
    print(f"Smart Helmet Milestones Count: {len(milestones)}")
    print(f"Smart Helmet Tasks Count: {len(tasks)}")
    print(f"Critical Path Length: {len(critical_path)}")

    tasks_with_deps = [t for t in tasks if t.get("dependencies")]
    tasks_with_reqs = [t for t in tasks if t.get("related_requirements")]
    tasks_with_comps = [t for t in tasks if t.get("related_components")]
    
    print(f"Tasks containing dependencies: {len(tasks_with_deps)} / {len(tasks)}")
    print(f"Tasks linked to requirements: {len(tasks_with_reqs)} / {len(tasks)}")
    print(f"Tasks linked to architecture components: {len(tasks_with_comps)} / {len(tasks)}")
    
    # Save plan sample to inspect
    with open("smart_helmet_plan_result.json", "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2)

    # 4. Test 2 — Smart Irrigation Monitoring System
    print("\n--- TEST 2: Smart Irrigation Monitoring System ---")
    irrigation_project = {
        "id": "smart-irrigation",
        "name": "Smart Irrigation Monitoring System",
        "idea": "An automated soil moisture sensing and drip irrigation system that optimizes water usage using weather data and soil sensors.",
        "objective": "Automate irrigation cycles based on soil moisture thresholds and rain forecast to reduce water consumption by 30%.",
        "type": "IoT / Automation",
        "technologies": ["ESP32", "Capacitive Soil Moisture Sensor", "Solenoid Valve", "MQTT", "Python/FastAPI"],
        "constraints": "Solar/battery operated in outdoor field conditions, intermittent cellular/WiFi connection.",
        "timeline": "6 Weeks",
        "stage": "Planning"
    }

    print("Analyzing Smart Irrigation requirements...")
    ir_status, ir_req = post_json(f"{BASE_URL}/api/projects/smart-irrigation/agents/requirements", {"project": irrigation_project})
    print(f"Smart Irrigation Requirements status: {ir_status}")

    print("Generating Smart Irrigation architecture...")
    ia_status, ia_arch = post_json(f"{BASE_URL}/api/projects/smart-irrigation/agents/architecture", {"project": irrigation_project})
    print(f"Smart Irrigation Architecture status: {ia_status}")

    print("Generating Smart Irrigation execution plan...")
    ip_status, ip_plan = post_json(f"{BASE_URL}/api/projects/smart-irrigation/agents/plan", {"project": irrigation_project})
    print(f"Smart Irrigation Plan HTTP Status: {ip_status}")
    assert ip_status == 200, f"Expected 200, got {ip_status}"

    ir_milestones = ip_plan.get("milestones", [])
    ir_tasks = ip_plan.get("tasks", [])
    print(f"Smart Irrigation Milestones: {len(ir_milestones)}")
    print(f"Smart Irrigation Tasks: {len(ir_tasks)}")
    
    with open("smart_irrigation_plan_result.json", "w", encoding="utf-8") as f:
        json.dump(ip_plan, f, indent=2)

    print("\n=== ALL TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
