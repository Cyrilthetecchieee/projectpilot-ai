"""End-to-end tests for Long-Term Engineering Memory.

Covers:
  A. Memory storage after successful recovery
  B. Memory retrieval for similar project (Project A -> B)
  C. Memory rejection for unrelated project (Project C)
  D. Memory deduplication
  E. Memory feedback recording
  F. Memory API endpoints
  G. Format-for-prompt generation
  H. Requirement Agent exclusion
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.schemas import EngineeringMemory, ProjectContext, RetrievedMemory
from app.services.memory_service import MemoryService


def make_project(
    pid: str,
    name: str,
    techs: list[str],
    idea: str = "",
    objective: str = "",
    ptype: str = "IoT",
) -> ProjectContext:
    return ProjectContext(
        id=pid,
        name=name,
        technologies=techs,
        idea=idea,
        objective=objective,
        type=ptype,
        constraints="",
        timeline="6 weeks",
        stage="development",
    )


def fresh_memory_service() -> MemoryService:
    """Create a MemoryService that does NOT persist to disk."""
    svc = MemoryService.__new__(MemoryService)
    svc.memories = {}
    return svc


# --------------------------------------------------------------------------- #
# TEST A: Store a lesson (Project A - ESP32 Wi-Fi recovery)
# --------------------------------------------------------------------------- #
def test_a_store_lesson():
    svc = fresh_memory_service()
    svc.store_lesson(
        category="architecture",
        problem_pattern="ESP32 Wi-Fi telemetry loss during intermittent connectivity",
        diagnosis="ESP32 loses Wi-Fi connection during field operation; telemetry data lost",
        successful_action="Implemented persistent local SPIFFS buffer with automatic upload retry",
        verification_summary="Verified 24h field test with 12 Wi-Fi drops - zero data loss",
        source_project_id="project-a",
        source_issue_id="ISS-001",
        technologies=["ESP32", "SPIFFS", "MQTT", "Wi-Fi"],
        affected_component_types=["hardware", "software"],
        initial_confidence=0.85,
    )
    assert len(svc.memories) == 1, f"Expected 1 memory, got {len(svc.memories)}"
    mem = list(svc.memories.values())[0]
    assert mem.source_project_id == "project-a"
    assert "ESP32" in mem.technologies
    assert mem.confidence == 0.85
    assert mem.status == "ACTIVE"
    print("  v TEST A PASSED: Lesson stored successfully")
    return svc


# --------------------------------------------------------------------------- #
# TEST B: Retrieve memory for similar project (Project B)
# --------------------------------------------------------------------------- #
def test_b_retrieve_similar(svc: MemoryService):
    project_b = make_project(
        "project-b",
        "Waste2Shield ESP32 Monitor",
        ["ESP32", "Firebase", "MQTT", "React"],
        idea="Remote waste monitoring with ESP32 telemetry",
        objective="Reliable telemetry from waste containers",
    )
    results = svc.retrieve_relevant_memories(
        project_b,
        agent_name="Architecture Agent",
        max_memories=3,
        threshold=0.2,
    )
    assert len(results) > 0, "Expected at least 1 memory retrieved for similar project"
    top = results[0]
    assert top.relevance_score > 0.0
    assert "ESP32" in top.memory.technologies
    assert top.agent_used_by == "Architecture Agent"
    print(f"  v TEST B PASSED: {len(results)} memory(s) retrieved, top score={top.relevance_score:.2f}")
    return results


# --------------------------------------------------------------------------- #
# TEST C: Reject memory for unrelated project (Project C)
# --------------------------------------------------------------------------- #
def test_c_reject_unrelated(svc: MemoryService):
    project_c = make_project(
        "project-c",
        "Hydraulic Press Controller",
        ["PLC", "Siemens S7", "HMI", "Profinet"],
        idea="Automated hydraulic press with PLC control",
        objective="Precision force control for metal forming",
        ptype="Industrial Automation",
    )
    results = svc.retrieve_relevant_memories(
        project_c,
        agent_name="Architecture Agent",
        max_memories=3,
        threshold=0.35,
    )
    assert len(results) == 0, f"Expected 0 memories for unrelated project, got {len(results)}"
    print("  v TEST C PASSED: No memories retrieved for unrelated project (correct rejection)")


# --------------------------------------------------------------------------- #
# TEST D: Deduplication
# --------------------------------------------------------------------------- #
def test_d_deduplication(svc: MemoryService):
    initial_count = len(svc.memories)
    # Store near-duplicate lesson (same problem, same techs, same category)
    svc.store_lesson(
        category="architecture",
        problem_pattern="ESP32 Wi-Fi telemetry loss during intermittent connectivity",
        diagnosis="ESP32 loses Wi-Fi connection during field operation; telemetry data lost",
        successful_action="Implemented persistent local SPIFFS buffer with automatic upload retry",
        verification_summary="Verified 24h field test - zero data loss",
        source_project_id="project-a",
        technologies=["ESP32", "SPIFFS", "MQTT", "Wi-Fi"],
        initial_confidence=0.80,
    )
    assert len(svc.memories) == initial_count, (
        f"Deduplication failed: expected {initial_count}, got {len(svc.memories)}"
    )
    print("  v TEST D PASSED: Duplicate lesson correctly merged (not duplicated)")


# --------------------------------------------------------------------------- #
# TEST E: Feedback recording
# --------------------------------------------------------------------------- #
def test_e_feedback(svc: MemoryService):
    mem_id = list(svc.memories.keys())[0]
    mem_before = svc.memories[mem_id]
    initial_helpful = mem_before.times_helpful

    updated = svc.record_feedback(mem_id, was_helpful=True)
    assert updated is not None, "record_feedback returned None"
    assert updated.times_helpful == initial_helpful + 1
    print("  v TEST E PASSED: Feedback recorded correctly")


# --------------------------------------------------------------------------- #
# TEST F: get_all_memories and format_memory_for_prompt
# --------------------------------------------------------------------------- #
def test_f_api_helpers(svc: MemoryService):
    all_mems = svc.get_all_memories()
    assert len(all_mems) > 0, "get_all_memories returned empty"
    assert isinstance(all_mems[0], EngineeringMemory)
    print(f"  v TEST F1 PASSED: get_all_memories returned {len(all_mems)} memory(s)")


def test_g_format_prompt(svc: MemoryService):
    project_b = make_project(
        "project-b",
        "Waste2Shield ESP32 Monitor",
        ["ESP32", "Firebase", "MQTT"],
    )
    results = svc.retrieve_relevant_memories(
        project_b, agent_name="Architecture Agent", max_memories=3, threshold=0.2
    )
    prompt = svc.format_memory_for_prompt(results)
    assert prompt is not None
    assert len(prompt) > 50
    assert "ADVISORY" in prompt.upper() or "advisory" in prompt.lower() or "lesson" in prompt.lower()
    print(f"  v TEST G PASSED: format_memory_for_prompt generated {len(prompt)} chars")


# --------------------------------------------------------------------------- #
# TEST H: Requirement Agent exclusion
# --------------------------------------------------------------------------- #
def test_h_requirement_agent_exclusion():
    """Verify that _retrieve_and_apply_memory in OrchestratorService returns None for Requirements."""
    from app.services.orchestrator_service import OrchestratorService
    from app.schemas import OrchestratorRun, OrchestratorState

    # Create minimal stores
    run = OrchestratorRun(project_id="test-h", state=OrchestratorState.RUNNING)
    svc = OrchestratorService(
        projects={},
        requirements_store={},
        architecture_store={},
        plan_store={},
        review_store={},
        test_store={},
        orchestrator_store={"test-h": run},
        activity_store={},
        save_db_fn=lambda: None,
        now_iso_fn=lambda: "2025-01-01T00:00:00Z",
    )

    project = make_project("test-h", "Test", ["ESP32", "MQTT"])
    result = svc._retrieve_and_apply_memory(project, "Requirement Agent", run)
    assert result is None, f"Expected None for Requirement Agent, got {result}"

    result2 = svc._retrieve_and_apply_memory(project, "Requirements", run)
    assert result2 is None, f"Expected None for Requirements, got {result2}"

    print("  v TEST H PASSED: Requirement Agent correctly excluded from memory retrieval")


# --------------------------------------------------------------------------- #
# Run all tests
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  LONG-TERM ENGINEERING MEMORY - TEST SUITE")
    print("=" * 60 + "\n")

    svc = test_a_store_lesson()
    test_b_retrieve_similar(svc)
    test_c_reject_unrelated(svc)
    test_d_deduplication(svc)
    test_e_feedback(svc)
    test_f_api_helpers(svc)
    test_g_format_prompt(svc)
    test_h_requirement_agent_exclusion()

    print("\n" + "=" * 60)
    print("  ALL 8 TESTS PASSED")
    print("=" * 60 + "\n")
