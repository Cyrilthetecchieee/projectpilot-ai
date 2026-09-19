with open("src/types.ts", "r", encoding="utf-8") as f:
    content = f.read()

types_code = """
export type OrchestratorState = 'INITIALIZED' | 'REQUIREMENTS_PENDING' | 'REQUIREMENTS_COMPLETE' | 'ARCHITECTURE_PENDING' | 'ARCHITECTURE_COMPLETE' | 'PLANNING_PENDING' | 'PLANNING_COMPLETE' | 'REVIEW_PENDING' | 'REVIEW_COMPLETE' | 'TESTING_PENDING' | 'TESTING_COMPLETE' | 'READY' | 'PAUSED' | 'FAILED' | 'BLOCKED'

export interface DecisionRecord {
  id: string;
  timestamp: string;
  previous_state: string;
  next_state: string;
  action: string;
  agent: string;
  reason: string;
  result: string;
  retry_count: number;
}

export interface OrchestratorRun {
  project_id: string;
  state: OrchestratorState;
  current_agent: string;
  current_action: string;
  progress_steps: string[];
  decisions: DecisionRecord[];
  execution_count: number;
  correction_cycles: number;
  is_running: boolean;
  human_input_required: boolean;
  human_input_reason: string;
  error_message: string;
}
"""

if "OrchestratorState" not in content:
    content += "\n" + types_code
    with open("src/types.ts", "w", encoding="utf-8") as f:
        f.write(content)
