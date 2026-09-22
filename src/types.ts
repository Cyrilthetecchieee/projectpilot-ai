export type AgentStatus = 'idle' | 'running' | 'success' | 'error'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

export interface Requirement { id: string; text: string; kind: 'Functional' | 'Non-functional'; priority: Priority; status: 'Validated' | 'Needs review' | 'Draft' }
export interface ArchitectureComponent { id: string; name: string; status: string; responsibility: string; inputs: string[]; outputs: string[]; type?: string; technology?: string; relatedRequirements?: string[] }
export interface ArchitectureConnection { source: string; target: string; interface: string; protocol: string; data: string; description: string }
export interface ArchitectureDataFlow { step: number; description: string }
export interface ArchitectureDecision { decision: string; reason: string }
export interface ArchitectureGap { title: string; severity: Priority; reason: string; recommendedAction: string }
<<<<<<< HEAD
export interface Milestone { id: string; title: string; description: string; order: number }
export interface Task { id: string; title: string; milestone: string; priority: Priority; status: TaskStatus; dependency?: string; successCriteria: string; description?: string; milestone_id?: string; estimated_effort?: string; dependencies?: string[]; related_requirements?: string[]; related_components?: string[]; success_criteria?: string[]; is_critical_path?: boolean }
=======
export interface Task { id: string; title: string; milestone: string; priority: Priority; status: TaskStatus; dependency?: string; successCriteria: string }
export interface MilestoneData { id: string; title: string; description: string; order: number }
export interface Task { id: string; title: string; milestone: string; priority: Priority; status: TaskStatus; dependency?: string; successCriteria: string; estimatedEffort?: string; dependencies?: string[]; relatedRequirements?: string[]; relatedComponents?: string[]; successCriteriaList?: string[]; isCriticalPath?: boolean }
>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3
export interface Risk { id: string; title: string; severity: Priority; detail: string; recommendation: string; resolved: boolean }
export interface TestCase { id: string; scenario: string; precondition: string; expected: string; status: 'Pending' | 'Passed' | 'Failed' }
export interface AgentRun { id: string; agent: string; action: string; status: 'Completed' | 'Needs attention'; duration: string; createdAt: string; trigger?: string; model?: string; provider?: string; startedAt?: string; completedAt?: string; summary?: string }
export interface NextAction { title: string; description: string; priority: Priority; effort: string; criteria: string[] }
<<<<<<< HEAD
export interface Project { id: string; name: string; idea: string; objective: string; type: string; technologies: string[]; constraints: string; timeline: string; stage: string; completion: number; requirements: Requirement[]; architecture: ArchitectureComponent[]; architectureConnections?: ArchitectureConnection[]; architectureDataFlow?: ArchitectureDataFlow[]; architectureDecisions?: ArchitectureDecision[]; architectureGaps?: ArchitectureGap[]; tasks: Task[]; milestones?: Milestone[]; criticalPath?: string[]; planningNotes?: string[]; risks: Risk[]; tests: TestCase[]; activity: AgentRun[]; nextAction: NextAction; requirementProblem?: string; requirementConstraints?: string[]; assumptions?: string[]; openQuestions?: string[] }
=======
export interface Project { id: string; name: string; idea: string; objective: string; type: string; technologies: string[]; constraints: string; timeline: string; stage: string; completion: number; requirements: Requirement[]; architecture: ArchitectureComponent[]; architectureConnections?: ArchitectureConnection[]; architectureDataFlow?: ArchitectureDataFlow[]; architectureDecisions?: ArchitectureDecision[]; architectureGaps?: ArchitectureGap[]; tasks: Task[]; risks: Risk[]; tests: TestCase[]; activity: AgentRun[]; nextAction: NextAction; requirementProblem?: string; requirementConstraints?: string[]; assumptions?: string[]; openQuestions?: string[] }
export interface Project { id: string; name: string; idea: string; objective: string; type: string; technologies: string[]; constraints: string; timeline: string; stage: string; completion: number; requirements: Requirement[]; architecture: ArchitectureComponent[]; architectureConnections?: ArchitectureConnection[]; architectureDataFlow?: ArchitectureDataFlow[]; architectureDecisions?: ArchitectureDecision[]; architectureGaps?: ArchitectureGap[]; milestones?: MilestoneData[]; plannerSummary?: string; planningNotes?: string[]; criticalPath?: string[]; tasks: Task[]; risks: Risk[]; tests: TestCase[]; activity: AgentRun[]; nextAction: NextAction; requirementProblem?: string; requirementConstraints?: string[]; assumptions?: string[]; openQuestions?: string[] }
>>>>>>> 577a5319ea8e42f0946457bbb7e464c397841ef3

export type CredentialType = 'PLATFORM_TOKEN' | 'PROVIDER_API_KEY'
export type ApiKeyProvider = 'Google Gemini' | 'OpenAI' | 'NVIDIA' | 'Other'
export type ApiKeyEnvironment = 'Development' | 'Staging' | 'Production'
export type ApiKeyScope = 'run:agents' | 'read:project' | 'write:project' | 'manage:keys' | 'admin'
export type ApiKeyStatus = 'Active' | 'Revoked'

export interface CredentialMetadata {
  id: string
  name?: string
  provider: ApiKeyProvider
  credentialType: CredentialType
  environment?: ApiKeyEnvironment
  permissions: ApiKeyScope[]
  scopes?: ApiKeyScope[]
  maskedValue: string
  maskedKey?: string
  key?: string
  secretReference: string
  createdBy: string
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  status: ApiKeyStatus
}

export type ApiKey = CredentialMetadata

export interface GeneratePlatformTokenPayload {
  name: string
  provider: ApiKeyProvider
  environment: ApiKeyEnvironment
  permissions: ApiKeyScope[]
  expiresInDays?: number | null
}

export interface AddProviderApiKeyPayload {
  provider: ApiKeyProvider
  secretKey: string
  permissions: ApiKeyScope[]
  name?: string
  environment?: ApiKeyEnvironment
  expiresInDays?: number | null
}

export interface CreateApiKeyPayload {
  name: string
  provider: ApiKeyProvider
  environment: ApiKeyEnvironment
  scopes: ApiKeyScope[]
  secretKey?: string
  expiresInDays?: number | null
  credentialType?: CredentialType
}



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
