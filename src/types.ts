export type AgentStatus = 'idle' | 'running' | 'success' | 'error'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

export interface Requirement { id: string; text: string; kind: 'Functional' | 'Non-functional'; priority: Priority; status: 'Validated' | 'Needs review' | 'Draft' }
export interface ArchitectureComponent { id: string; name: string; status: string; responsibility: string; inputs: string[]; outputs: string[]; type?: string; technology?: string; relatedRequirements?: string[] }
export interface ArchitectureConnection { source: string; target: string; interface: string; protocol: string; data: string; description: string }
export interface ArchitectureDataFlow { step: number; description: string }
export interface ArchitectureDecision { decision: string; reason: string }
export interface ArchitectureGap { title: string; severity: Priority; reason: string; recommendedAction: string }
export interface Task { id: string; title: string; milestone: string; priority: Priority; status: TaskStatus; dependency?: string; successCriteria: string }
export interface Risk { id: string; title: string; severity: Priority; detail: string; recommendation: string; resolved: boolean }
export interface TestCase { id: string; scenario: string; precondition: string; expected: string; status: 'Pending' | 'Passed' | 'Failed' }
export interface AgentRun { id: string; agent: string; action: string; status: 'Completed' | 'Needs attention'; duration: string; createdAt: string; trigger?: string; model?: string; provider?: string; startedAt?: string; completedAt?: string; summary?: string }
export interface NextAction { title: string; description: string; priority: Priority; effort: string; criteria: string[] }
export interface Project { id: string; name: string; idea: string; objective: string; type: string; technologies: string[]; constraints: string; timeline: string; stage: string; completion: number; requirements: Requirement[]; architecture: ArchitectureComponent[]; architectureConnections?: ArchitectureConnection[]; architectureDataFlow?: ArchitectureDataFlow[]; architectureDecisions?: ArchitectureDecision[]; architectureGaps?: ArchitectureGap[]; tasks: Task[]; risks: Risk[]; tests: TestCase[]; activity: AgentRun[]; nextAction: NextAction; requirementProblem?: string; requirementConstraints?: string[]; assumptions?: string[]; openQuestions?: string[] }

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

