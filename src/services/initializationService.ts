import { demoProject } from '../data/demoProject'
import { projectService } from './projectService'
import type { Project, Risk, Task, TestCase } from '../types'

export type InitializationState = 'CREATED' | 'INITIALIZING' | 'READY' | 'FAILED'
export type InitializationAgentStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED'
export type InitializationAgent = 'requirements' | 'architecture' | 'planner' | 'reviewer' | 'testing'
export interface InitializationAgentProgress { agent: InitializationAgent; status: InitializationAgentStatus; summary?: string }
export interface InitializationStatus { status: InitializationState; progress: number; current_agent?: InitializationAgent; agents: InitializationAgentProgress[]; error?: string }

const STATUS_KEY = 'projectpilot.initialization.status'
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const agents: InitializationAgent[] = ['requirements', 'architecture', 'planner', 'reviewer', 'testing']
const labels: Record<InitializationAgent, string> = { requirements: 'Requirement Agent', architecture: 'Architecture Agent', planner: 'Planner Agent', reviewer: 'Reviewer Agent', testing: 'Test Agent' }

const initialStatus = (): InitializationStatus => ({ status: 'CREATED', progress: 0, agents: agents.map(agent => ({ agent, status: 'WAITING' })) })
const allStatus = (status: InitializationState, progress: number, current_agent?: InitializationAgent): InitializationStatus => ({ status, progress, current_agent, agents: agents.map(agent => ({ agent, status: 'WAITING' })) })
const saveStatus = (projectId: string, status: InitializationStatus) => localStorage.setItem(`${STATUS_KEY}.${projectId}`, JSON.stringify(status))
const readStatus = (projectId: string): InitializationStatus => { try { return JSON.parse(localStorage.getItem(`${STATUS_KEY}.${projectId}`) || '') as InitializationStatus } catch { return initialStatus() } }
const updateAgent = (projectId: string, agent: InitializationAgent, status: InitializationAgentStatus, summary?: string) => { const current = readStatus(projectId); saveStatus(projectId, { ...current, current_agent: status === 'RUNNING' ? agent : current.current_agent, agents: current.agents.map(item => item.agent === agent ? { ...item, status, summary } : item) }) }

function generatedRequirements(project: Project) { return [
  { id: 'FR-01', text: `The system shall solve the primary objective: ${project.objective}`, kind: 'Functional' as const, priority: 'High' as const, status: 'Validated' as const },
  { id: 'FR-02', text: 'The system shall provide a clear success state for the core workflow.', kind: 'Functional' as const, priority: 'High' as const, status: 'Needs review' as const },
  { id: 'FR-03', text: 'The system shall record important decisions for later verification.', kind: 'Functional' as const, priority: 'Medium' as const, status: 'Draft' as const },
  { id: 'NFR-01', text: 'The solution shall remain reliable within the stated constraints.', kind: 'Non-functional' as const, priority: 'High' as const, status: 'Needs review' as const },
  { id: 'NFR-02', text: 'Failure states shall not create an unsafe or invalid result.', kind: 'Non-functional' as const, priority: 'Critical' as const, status: 'Validated' as const },
] }
function generatedArchitecture(project: Project) { return ['Input & Interface', 'Core Processing', 'Persistence Layer', 'Integration Boundary', 'Observability'].map((name, index) => ({ id: `ac-${index + 1}`, name, status: index === 3 ? 'Needs decision' : 'Active', responsibility: `Owns the ${name.toLowerCase()} responsibilities for ${project.name}.`, inputs: index ? ['Validated project context'] : ['User and system inputs'], outputs: index === 4 ? ['Diagnostics and metrics'] : ['Structured output'] })) }
function generatedTasks(): Task[] { return ['Confirm success criteria', 'Define system interfaces', 'Implement core workflow', 'Add failure handling', 'Create verification harness', 'Run integration review'].map((title, index) => ({ id: `T-${String(index + 1).padStart(2, '0')}`, title, milestone: index < 2 ? 'Requirements & Design' : index < 4 ? 'Implementation' : 'Validation', priority: index === 3 ? 'Critical' : 'High', status: index === 0 ? 'Completed' : 'Pending', dependency: index ? `T-${String(index).padStart(2, '0')}` : undefined, successCriteria: `${title} is documented and verified against the project objective.` })) }
function generatedRisks(): Risk[] { return [{ id: 'r-init-01', title: 'Failure behavior needs an explicit decision', severity: 'High', detail: 'The initial project context does not yet define what happens when the primary workflow cannot complete.', recommendation: 'Document valid, invalid, unavailable and unknown states before implementation.', resolved: false }, { id: 'r-init-02', title: 'Integration boundary is not finalized', severity: 'Medium', detail: 'The system interface between the core workflow and its external dependency is still open.', recommendation: 'Choose a protocol and define the contract with example payloads.', resolved: false }] }
function generatedTests(): TestCase[] { return [{ id: 'TC-01', scenario: 'Valid primary workflow', precondition: 'All required inputs are valid', expected: 'The system completes the objective successfully', status: 'Pending' }, { id: 'TC-02', scenario: 'Missing required input', precondition: 'One required input is unavailable', expected: 'The system rejects the request safely', status: 'Pending' }, { id: 'TC-03', scenario: 'Integration loss', precondition: 'External dependency is unreachable', expected: 'A visible fault state is recorded', status: 'Pending' }] }

export class ProjectInitializationOrchestrator {
  async initialize_project(projectId: string): Promise<InitializationStatus> {
    const project = projectService.getProject(projectId)
    if (!project) throw new Error('Project not found')
    if (projectId === 'smart-helmet') {
      const ready = allStatus('READY', 100)
      saveStatus(projectId, { ...ready, agents: agents.map(agent => ({ agent, status: 'COMPLETED', summary: 'Demo workspace already initialized' })) })
      return readStatus(projectId)
    }
    saveStatus(projectId, allStatus('INITIALIZING', 0))
    try {
      await this.runRequirements(project)
      await this.runArchitecture(project)
      await this.runPlanner(project)
      await this.runReviewer(project)
      await this.runTesting(project)
      const ready = readStatus(projectId)
      saveStatus(projectId, { ...ready, status: 'READY', progress: 100, current_agent: undefined })
      return readStatus(projectId)
    } catch (error) {
      const failed = readStatus(projectId)
      saveStatus(projectId, { ...failed, status: 'FAILED', error: error instanceof Error ? error.message : 'Initialization failed' })
      return readStatus(projectId)
    }
  }
  private async runRequirements(project: Project) { updateAgent(project.id, 'requirements', 'RUNNING', 'Analyzing project context'); await wait(650); const next = projectService.getProject(project.id)!; next.requirements = generatedRequirements(next);  projectService.saveProject(next); saveStatus(project.id, { ...readStatus(project.id), progress: 20, agents: readStatus(project.id).agents.map(item => item.agent === 'requirements' ? { ...item, status: 'COMPLETED', summary: `${next.requirements.length} requirements identified` } : item) }) }
  private async runArchitecture(project: Project) { updateAgent(project.id, 'architecture', 'RUNNING', 'Designing system architecture'); await wait(650); const next = projectService.getProject(project.id)!; next.architecture = generatedArchitecture(next);  projectService.saveProject(next); saveStatus(project.id, { ...readStatus(project.id), progress: 40, agents: readStatus(project.id).agents.map(item => item.agent === 'architecture' ? { ...item, status: 'COMPLETED', summary: `${next.architecture.length} architecture components` } : item) }) }
  private async runPlanner(project: Project) { updateAgent(project.id, 'planner', 'RUNNING', 'Building execution plan'); await wait(650); const next = projectService.getProject(project.id)!; next.tasks = generatedTasks();  projectService.saveProject(next); saveStatus(project.id, { ...readStatus(project.id), progress: 60, agents: readStatus(project.id).agents.map(item => item.agent === 'planner' ? { ...item, status: 'COMPLETED', summary: `${next.tasks.length} execution tasks created` } : item) }) }
  private async runReviewer(project: Project) { updateAgent(project.id, 'reviewer', 'RUNNING', 'Reviewing engineering gaps'); await wait(650); const next = projectService.getProject(project.id)!; next.risks = generatedRisks();  projectService.saveProject(next); saveStatus(project.id, { ...readStatus(project.id), progress: 80, agents: readStatus(project.id).agents.map(item => item.agent === 'reviewer' ? { ...item, status: 'COMPLETED', summary: `${next.risks.length} engineering risks identified` } : item) }) }
  private async runTesting(project: Project) { updateAgent(project.id, 'testing', 'RUNNING', 'Generating verification coverage'); await wait(650); const next = projectService.getProject(project.id)!; next.tests = generatedTests(); next.completion = 0; next.nextAction = { title: 'Confirm success criteria', description: 'ProjectPilot found that the core objective needs measurable acceptance criteria before implementation begins.', priority: 'High', effort: '20–30 min', criteria: ['Primary success state is explicit', 'Failure behavior is documented', 'The first task has an observable outcome'] };  projectService.saveProject(next); saveStatus(project.id, { ...readStatus(project.id), progress: 100, agents: readStatus(project.id).agents.map(item => item.agent === 'testing' ? { ...item, status: 'COMPLETED', summary: `${next.tests.length} verification cases created` } : item) }) }
  get_status(projectId: string) { return readStatus(projectId) }
  retry(projectId: string) { return this.initialize_project(projectId) }
}

export const initializationService = new ProjectInitializationOrchestrator()
export const initializationApi = { postInitialize: (projectId: string) => initializationService.initialize_project(projectId), getInitializationStatus: (projectId: string) => initializationService.get_status(projectId) }

export class AgentTriggerService { onProjectCreated(projectId: string) { return initializationService.initialize_project(projectId) } onRequirementsChanged(projectId: string) { return initializationService.get_status(projectId) } onArchitectureChanged(projectId: string) { return initializationService.get_status(projectId) } onTaskCompleted(projectId: string) { return initializationService.get_status(projectId) } onProjectReviewRequested(projectId: string) { return initializationService.get_status(projectId) } onTestGenerationRequested(projectId: string) { return initializationService.get_status(projectId) } onRiskCreated(projectId: string) { return initializationService.get_status(projectId) } }

export const agentTriggerService = new AgentTriggerService()
export const initializationSeed = { demoProject, labels }
