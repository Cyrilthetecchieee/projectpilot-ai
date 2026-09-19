export type AgentStatus = 'idle' | 'running' | 'success' | 'error'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

export interface Requirement { id: string; text: string; kind: 'Functional' | 'Non-functional'; priority: Priority; status: 'Validated' | 'Needs review' | 'Draft' }
export interface ArchitectureComponent { id: string; name: string; status: string; responsibility: string; inputs: string[]; outputs: string[] }
export interface Task { id: string; title: string; milestone: string; priority: Priority; status: TaskStatus; dependency?: string; successCriteria: string }
export interface Risk { id: string; title: string; severity: Priority; detail: string; recommendation: string; resolved: boolean }
export interface TestCase { id: string; scenario: string; precondition: string; expected: string; status: 'Pending' | 'Passed' | 'Failed' }
export interface AgentRun { id: string; agent: string; action: string; status: 'Completed' | 'Needs attention'; duration: string; createdAt: string }
export interface NextAction { title: string; description: string; priority: Priority; effort: string; criteria: string[] }
export interface Project { id: string; name: string; idea: string; objective: string; type: string; technologies: string[]; constraints: string; timeline: string; stage: string; completion: number; requirements: Requirement[]; architecture: ArchitectureComponent[]; tasks: Task[]; risks: Risk[]; tests: TestCase[]; activity: AgentRun[]; nextAction: NextAction }
