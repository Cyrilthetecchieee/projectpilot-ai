"""Quality Guard module for ProjectPilot AI agents.

Detects overly generic placeholders and validates that generated artifacts
are concretely grounded in the project domain, components, and requirements.
Enforces at most one corrective regeneration pass.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.schemas import (
    ArchitectureAnalysis,
    ExecutionPlan,
    RequirementAnalysis,
    ReviewAnalysis,
    TestAnalysis,
)

logger = logging.getLogger("quality_guard")

# Generic placeholder phrases that indicate lack of project grounding
GENERIC_PHRASES = [
    "core processing",
    "core system",
    "core engine",
    "core service",
    "input & interface",
    "input and interface",
    "input interface",
    "output layer",
    "output interface",
    "persistence layer",
    "external integration",
    "external dependency",
    "generic processing",
    "primary workflow",
    "system component",
    "define interfaces",
    "define system interfaces",
    "confirm success criteria",
    "implement core system",
    "validate functionality",
    "complete hardware",
    "work on backend",
    "do testing",
    "failure behavior needs an explicit decision",
    "integration boundary is not finalized",
    "valid primary workflow",
    "missing required input",
    "integration loss",
    "owns the core processing responsibilities",
]

_GENERIC_REGEXES = [
    re.compile(r"\b" + re.escape(phrase) + r"\b", re.IGNORECASE)
    for phrase in GENERIC_PHRASES
]


def detect_generic_terms(text: str) -> list[str]:
    """Return all generic placeholder terms found in text."""
    if not text:
        return []
    matches = []
    for pattern, phrase in zip(_GENERIC_REGEXES, GENERIC_PHRASES):
        if pattern.search(text):
            matches.append(phrase)
    return matches


class QualityGuard:
    """Validates domain-specificity of agent artifacts and generates targeted correction prompts."""

    @staticmethod
    def validate_requirements(analysis: RequirementAnalysis) -> list[str]:
        issues: list[str] = []
        for req in analysis.functional_requirements:
            terms = detect_generic_terms(req.title + " " + req.description)
            if terms:
                issues.append(f"Functional requirement '{req.title}' uses generic phrase(s): {', '.join(terms)}")
        for req in analysis.non_functional_requirements:
            terms = detect_generic_terms(req.title + " " + req.description)
            if terms:
                issues.append(f"Non-functional requirement '{req.title}' uses generic phrase(s): {', '.join(terms)}")
        return issues

    @staticmethod
    def validate_architecture(analysis: ArchitectureAnalysis) -> list[str]:
        issues: list[str] = []
        num_components = len(analysis.components)
        num_connections = len(analysis.connections)
        num_data_flow = len(analysis.data_flow)

        # Explicit requirement: if components >= 2, connections and data_flow must not be empty
        if num_components >= 2:
            if num_connections == 0:
                issues.append("Architecture contains multiple components but connections == 0. Explicit interfaces between components are required.")
            if num_data_flow == 0:
                issues.append("Architecture contains multiple components but data_flow_steps == 0. End-to-end data flow steps are required.")

        # Check for generic component names
        generic_names = {
            "input & interface", "input and interface", "input interface",
            "core processing", "core system", "persistence layer",
            "external integration", "output layer", "storage layer",
            "database layer", "processing unit"
        }
        for comp in analysis.components:
            name_clean = comp.name.strip().lower()
            if name_clean in generic_names:
                issues.append(f"Component '{comp.name}' is an unacceptable generic placeholder name. Derive a real component name from project domain.")
            terms = detect_generic_terms(comp.responsibility)
            if terms:
                issues.append(f"Component '{comp.name}' responsibility uses generic phrase(s): {', '.join(terms)}")

        return issues

    @staticmethod
    def validate_plan(plan: ExecutionPlan) -> list[str]:
        issues: list[str] = []
        generic_task_titles = {
            "define interfaces", "define system interfaces", "confirm success criteria",
            "implement core system", "validate functionality", "do testing",
            "work on backend", "complete hardware", "setup project", "system integration"
        }
        for task in plan.tasks:
            title_clean = task.title.strip().lower()
            if title_clean in generic_task_titles:
                issues.append(f"Task '{task.title}' is an unacceptable generic title. State specifically what technical item is being built or configured.")
            terms = detect_generic_terms(task.title + " " + task.description)
            if terms:
                issues.append(f"Task '{task.title}' contains generic terminology: {', '.join(terms)}")
        return issues

    @staticmethod
    def validate_review(review: ReviewAnalysis) -> list[str]:
        issues: list[str] = []
        generic_risk_titles = {
            "failure behavior needs an explicit decision",
            "integration boundary is not finalized",
            "missing documentation",
            "error handling needed",
            "system failure risk",
        }
        for risk in review.risks:
            title_clean = risk.title.strip().lower()
            if title_clean in generic_risk_titles:
                issues.append(f"Risk '{risk.title}' is too vague. State specifically WHAT is wrong, WHERE it occurs, and WHY it matters in this project.")
            terms = detect_generic_terms(risk.title + " " + risk.detail)
            if terms:
                issues.append(f"Risk '{risk.title}' contains generic terminology: {', '.join(terms)}")
        return issues

    @staticmethod
    def validate_test(test: TestAnalysis) -> list[str]:
        issues: list[str] = []
        generic_scenarios = {
            "valid primary workflow", "missing required input", "integration loss",
            "basic test", "error test", "system test", "happy path"
        }
        for tc in test.test_cases:
            scen_clean = tc.scenario.strip().lower()
            if scen_clean in generic_scenarios:
                issues.append(f"Test scenario '{tc.scenario}' is an unacceptable generic scenario. Verify a concrete project behavior, hardware link, or failure mode.")
            terms = detect_generic_terms(tc.scenario)
            if terms:
                issues.append(f"Test scenario '{tc.scenario}' contains generic phrase: {', '.join(terms)}")
        return issues

    @staticmethod
    def build_correction_prompt(agent_name: str, issues: list[str], previous_content: str) -> str:
        """Create a targeted, non-punitive prompt to guide the model to replace generic placeholders."""
        issue_bullets = "\n".join(f"- {issue}" for issue in issues)
        return (
            f"Your previous {agent_name} output was structurally valid but contained unacceptable generic placeholders or incomplete interfaces:\n\n"
            f"{issue_bullets}\n\n"
            f"CRITICAL INSTRUCTIONS FOR REGENERATION:\n"
            f"1. Replace all generic phrases with concrete, project-specific technologies, hardware, components, protocols, and measurable targets grounded in the project context.\n"
            f"2. Ensure all components, tasks, risks, and tests reference actual domain entities.\n"
            f"3. Return exactly ONE valid JSON object matching the required schema.\n"
            f"4. Do NOT include markdown fences, preambles, or postscript explanations.\n\n"
            f"Previous output for reference:\n{previous_content[:2000]}"
        )


quality_guard = QualityGuard()
