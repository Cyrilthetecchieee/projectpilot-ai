"""Long-Term Engineering Memory Service.

Stores, deduplicates, retrieves, and updates proven engineering lessons
across projects. Memory is strictly advisory context and does NOT override
current project requirements.
"""

from __future__ import annotations

import datetime as _dt
import json
import re
from pathlib import Path
from typing import Any

from app.schemas import EngineeringMemory, ProjectContext, RetrievedMemory

MEMORY_FILE = Path(__file__).resolve().parent.parent / "storage" / "engineering_memory.json"
MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)


class MemoryService:
    def __init__(self) -> None:
        self.memories: dict[str, EngineeringMemory] = {}
        self.load()

    def _now_iso(self) -> str:
        return _dt.datetime.now(_dt.timezone.utc).isoformat()

    def _next_memory_id(self) -> str:
        existing_nums: list[int] = []
        for mid in self.memories.keys():
            if mid.startswith("MEM-"):
                try:
                    existing_nums.append(int(mid.split("-")[1]))
                except (ValueError, IndexError):
                    pass
        next_num = max(existing_nums, default=0) + 1
        return f"MEM-{next_num:03d}"

    def load(self) -> None:
        """Load memories from disk."""
        if not MEMORY_FILE.exists():
            return
        try:
            raw = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
            self.memories.clear()
            for k, v in raw.items():
                self.memories[k] = EngineeringMemory.model_validate(v)
        except Exception as e:
            print(f"Warning: Failed to load engineering memory: {e}")

    def save(self) -> None:
        """Persist memories to disk."""
        try:
            data = {k: v.model_dump() for k, v in self.memories.items()}
            MEMORY_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"Warning: Failed to save engineering memory: {e}")

    def _sanitize_text(self, text: str) -> str:
        """Remove potential secrets or raw credential strings."""
        if not text:
            return ""
        # Remove bearer tokens, api keys, passwords
        text = re.sub(r"(?i)(api[_-]?key|secret|password|bearer\s+[a-z0-9_\-\.]+)", "[REDACTED]", text)
        return text.strip()

    def _tokenize(self, text: str) -> set[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-]{3,}\b", text.lower())
        stopwords = {
            "the", "and", "for", "with", "this", "that", "from", "are", "was",
            "were", "will", "would", "should", "could", "have", "has", "had",
            "not", "but", "all", "any", "when", "where", "how", "what", "which",
            "system", "project", "component", "during", "after", "before"
        }
        return {w for w in words if w not in stopwords}

    def _compute_similarity(self, mem_a: EngineeringMemory, candidate_data: dict[str, Any]) -> float:
        """Calculate similarity between an existing memory and a candidate lesson."""
        # 1. Technology overlap
        techs_a = {t.lower() for t in mem_a.technologies}
        techs_b = {t.lower() for t in candidate_data.get("technologies", [])}
        tech_score = 0.0
        if techs_a and techs_b:
            tech_score = len(techs_a & techs_b) / len(techs_a | techs_b)
        elif not techs_a and not techs_b:
            tech_score = 0.5

        # 2. Problem pattern word overlap
        words_a = self._tokenize(f"{mem_a.problem_pattern} {mem_a.diagnosis}")
        words_b = self._tokenize(f"{candidate_data.get('problem_pattern', '')} {candidate_data.get('diagnosis', '')}")
        pattern_score = 0.0
        if words_a and words_b:
            pattern_score = len(words_a & words_b) / len(words_a | words_b)

        # 3. Category match
        cat_match = 1.0 if mem_a.category.lower() == str(candidate_data.get("category", "")).lower() else 0.0

        return 0.45 * tech_score + 0.40 * pattern_score + 0.15 * cat_match

    def store_lesson(
        self,
        source_project_id: str,
        category: str,
        problem_pattern: str,
        diagnosis: str,
        successful_action: str,
        verification_summary: str,
        technologies: list[str] | None = None,
        context_tags: list[str] | None = None,
        affected_component_types: list[str] | None = None,
        source_issue_id: str | None = None,
        initial_confidence: float = 0.85,
    ) -> tuple[EngineeringMemory, bool]:
        """Store a proven lesson with duplicate detection and confidence reinforcement."""
        candidate_data = {
            "category": category,
            "problem_pattern": self._sanitize_text(problem_pattern),
            "diagnosis": self._sanitize_text(diagnosis),
            "successful_action": self._sanitize_text(successful_action),
            "verification_summary": self._sanitize_text(verification_summary),
            "technologies": [self._sanitize_text(t) for t in (technologies or []) if t],
            "context_tags": [self._sanitize_text(t) for t in (context_tags or []) if t],
            "affected_component_types": affected_component_types or [],
        }

        # Check for near duplicate
        for mem in self.memories.values():
            if mem.status == "ACTIVE":
                sim = self._compute_similarity(mem, candidate_data)
                if sim >= 0.75:
                    # Update existing memory confidence & reinforcement
                    mem.confidence = min(1.0, round(mem.confidence + 0.05, 2))
                    mem.times_helpful += 1
                    # Merge technologies & tags
                    for t in candidate_data["technologies"]:
                        if t not in mem.technologies:
                            mem.technologies.append(t)
                    for tag in candidate_data["context_tags"]:
                        if tag not in mem.context_tags:
                            mem.context_tags.append(tag)
                    self.save()
                    return mem, False

        # Create new memory
        memory_id = self._next_memory_id()
        new_memory = EngineeringMemory(
            memory_id=memory_id,
            source_project_id=source_project_id,
            source_issue_id=source_issue_id,
            created_at=self._now_iso(),
            category=category,
            problem_pattern=candidate_data["problem_pattern"],
            context_tags=candidate_data["context_tags"],
            technologies=candidate_data["technologies"],
            affected_component_types=candidate_data["affected_component_types"],
            diagnosis=candidate_data["diagnosis"],
            successful_action=candidate_data["successful_action"],
            verification_summary=candidate_data["verification_summary"],
            confidence=initial_confidence,
            times_retrieved=0,
            times_helpful=1,
            status="ACTIVE",
        )
        self.memories[memory_id] = new_memory
        self.save()
        return new_memory, True

    def calculate_relevance(
        self,
        project: ProjectContext,
        memory: EngineeringMemory,
        agent_name: str,
        issue_context: dict[str, Any] | None = None,
    ) -> tuple[float, str]:
        """Explainable scoring formula for memory retrieval."""
        if memory.status != "ACTIVE":
            return 0.0, "Memory is archived"

        # 1. Technology overlap (Weight: 0.40)
        proj_techs = {t.lower() for t in project.technologies}
        mem_techs = {t.lower() for t in memory.technologies}
        overlap_techs = proj_techs & mem_techs
        tech_score = 0.0
        if proj_techs and mem_techs:
            tech_score = len(overlap_techs) / len(proj_techs | mem_techs)
        elif not mem_techs:
            tech_score = 0.2

        # 2. Context & tag overlap (Weight: 0.25)
        proj_context_text = f"{project.name} {project.type} {project.objective} {project.constraints}".lower()
        proj_tokens = self._tokenize(proj_context_text)
        mem_tokens = self._tokenize(f"{memory.problem_pattern} {' '.join(memory.context_tags)} {memory.diagnosis}")
        overlap_tokens = proj_tokens & mem_tokens
        context_score = 0.0
        if proj_tokens and mem_tokens:
            context_score = min(1.0, len(overlap_tokens) / max(3, len(mem_tokens)))

        # 3. Agent & Category alignment (Weight: 0.15)
        cat_score = 0.0
        agent_lower = agent_name.lower()
        if "architecture" in agent_lower and memory.category in ("Architecture", "Hardware"):
            cat_score = 1.0
        elif "planner" in agent_lower and memory.category in ("Execution Plan", "Operational"):
            cat_score = 1.0
        elif "review" in agent_lower:
            cat_score = 0.9  # Reviewer cares about all categories
        elif "test" in agent_lower:
            cat_score = 0.8  # Test agent leverages all verification lessons

        # 4. Issue context boost (Weight: 0.10)
        issue_score = 0.0
        if issue_context:
            issue_text = f"{issue_context.get('description', '')} {issue_context.get('likely_causes', '')}".lower()
            issue_tokens = self._tokenize(issue_text)
            if issue_tokens and (issue_tokens & mem_tokens):
                issue_score = min(1.0, len(issue_tokens & mem_tokens) / 3.0)

        # 5. Confidence boost (Weight: 0.10)
        confidence_score = memory.confidence

        final_score = round(
            0.40 * tech_score
            + 0.25 * context_score
            + 0.15 * cat_score
            + 0.10 * issue_score
            + 0.10 * confidence_score,
            3,
        )

        reasons: list[str] = []
        if overlap_techs:
            reasons.append(f"Technology overlap: {', '.join(sorted(overlap_techs))}")
        if overlap_tokens:
            top_kw = list(sorted(overlap_tokens))[:3]
            reasons.append(f"Context keyword match: {', '.join(top_kw)}")
        if not reasons:
            reasons.append(f"General domain alignment in {memory.category}")

        reason_str = "; ".join(reasons)
        return final_score, reason_str

    def retrieve_relevant_memories(
        self,
        project: ProjectContext,
        agent_name: str,
        issue_context: dict[str, Any] | None = None,
        max_memories: int = 3,
        threshold: float = 0.35,
    ) -> list[RetrievedMemory]:
        """Retrieve up to max_memories relevant engineering lessons above the threshold."""
        # Never retrieve for Requirement Agent to avoid inventing requirements
        if "requirement" in agent_name.lower():
            return []

        scored_candidates: list[tuple[float, str, EngineeringMemory]] = []
        for mem in self.memories.values():
            if mem.source_project_id == project.id:
                # Do not retrieve memory from the current project itself as "prior project memory"
                continue
            score, reason = self.calculate_relevance(project, mem, agent_name, issue_context)
            if score >= threshold:
                scored_candidates.append((score, reason, mem))

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        results: list[RetrievedMemory] = []
        for score, reason, mem in scored_candidates[:max_memories]:
            mem.times_retrieved += 1
            results.append(
                RetrievedMemory(
                    memory=mem,
                    relevance_score=score,
                    reason_retrieved=reason,
                    agent_used_by=agent_name,
                )
            )

        if results:
            self.save()

        return results

    def record_feedback(self, memory_id: str, was_helpful: bool) -> EngineeringMemory | None:
        """Record explicit user or system outcome feedback for a memory."""
        mem = self.memories.get(memory_id)
        if not mem:
            return None
        if was_helpful:
            mem.times_helpful += 1
            mem.confidence = min(1.0, round(mem.confidence + 0.05, 2))
        else:
            mem.confidence = max(0.2, round(mem.confidence - 0.10, 2))
            if mem.confidence < 0.3:
                mem.status = "ARCHIVED"
        self.save()
        return mem

    def get_all_memories(self) -> list[EngineeringMemory]:
        """Return all stored engineering memories."""
        return list(self.memories.values())

    def format_memory_for_prompt(self, retrieved_memories: list[RetrievedMemory]) -> str:
        """Format retrieved memories as clear, advisory context for model consumption."""
        if not retrieved_memories:
            return ""

        lines: list[str] = [
            "\n==================================================",
            "PREVIOUS PROJECT ENGINEERING MEMORY (ADVISORY ONLY)",
            "==================================================",
            "These are lessons from previous projects.",
            "Use them only when applicable to the current project's actual requirements and constraints.",
            "Do not treat them as current-project facts. Do not invent or force components from other projects if not needed by the current project.",
            "",
        ]

        for i, rm in enumerate(retrieved_memories, 1):
            mem = rm.memory
            lines.append(f"[{i}. Lesson {mem.memory_id}] (Relevance: {rm.relevance_score:.0%}, Reason: {rm.reason_retrieved})")
            lines.append(f"  Category: {mem.category}")
            lines.append(f"  Problem Pattern: {mem.problem_pattern}")
            lines.append(f"  Root Cause Diagnosis: {mem.diagnosis}")
            lines.append(f"  Successful Resolution: {mem.successful_action}")
            lines.append(f"  Verification Strategy: {mem.verification_summary}")
            if mem.technologies:
                lines.append(f"  Observed Technologies: {', '.join(mem.technologies)}")
            lines.append("")

        return "\n".join(lines)


memory_service = MemoryService()
