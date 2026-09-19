with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

types_addition = """
export interface RecoveryTaskOption {
  needed: boolean;
  title: string;
  description: string;
  estimated_effort: string;
}

export interface IssueAnalysisResponse {
  issue_summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likely_causes: string[];
  recommended_fix: string[];
  affected_requirements: string[];
  affected_components: string[];
  blocked_tasks: string[];
  can_continue_other_tasks: boolean;
  recommended_next_action: string;
  recovery_task: RecoveryTaskOption;
}

export interface IssueRecord {
  id: string;
  project_id: string;
  task_id: string;
  description: string;
  image_path: string;
  analysis: IssueAnalysisResponse;
  status: string;
  created_at: string;
  resolved_at: string;
}
"""

if "IssueAnalysisResponse" not in content:
    content += "\n" + types_addition

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
