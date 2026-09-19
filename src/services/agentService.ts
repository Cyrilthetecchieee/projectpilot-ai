import type { ArchitectureComponent, ArchitectureConnection, ArchitectureDataFlow, ArchitectureDecision, Project, Requirement, Risk, Task, TestCase } from '../types'
import type { ArchitectureComponent, ArchitectureConnection, ArchitectureDataFlow, ArchitectureDecision, MilestoneData, Project, Requirement, Risk, Task, TestCase } from '../types'
import { apiKeyService } from './apiKeyService'

const wait = (ms = 850) => new Promise(resolve => setTimeout(resolve, ms))
const run = async <T,>(value: T): Promise<T> => {
  const engine = apiKeyService.getAiEngineStatus()
  if (engine.activeKey) {
    apiKeyService.validateApiKey(engine.activeKey.key)
  }
  await wait()
  return value
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

interface RequirementApiResponse {
  problem: string
  functional_requirements: { title: string; description: string; priority: 'critical' | 'high' | 'medium' | 'low' }[]
  non_functional_requirements: { title: string; description: string; priority: 'critical' | 'high' | 'medium' | 'low' }[]
  constraints: string[]
  assumptions: string[]
  open_questions: string[]
  provider: string
  model: string
  duration_ms: number
  summary: string
}

interface ArchitectureApiResponse {
  summary: string
  components: { id: string; name: string; type: string; responsibility: string; technology: string; inputs: string[]; outputs: string[]; related_requirements: string[] }[]
  connections: ArchitectureConnection[]
  data_flow: ArchitectureDataFlow[]
  architecture_decisions: ArchitectureDecision[]
  architecture_gaps: { title: string; severity: 'critical' | 'high' | 'medium' | 'low'; reason: string; recommended_action: string }[]
  provider: string
  model: string
  duration_ms: number
}

interface PlannerApiResponse {
  summary: string
  milestones: { id: string; title: string; description: string; order: number }[]
  tasks: { id: string; milestone_id: string; title: string; description: string; priority: 'critical' | 'high' | 'medium' | 'low'; status: string; estimated_effort: string; dependencies: string[]; related_requirements: string[]; related_components: string[]; success_criteria: string[] }[]
  critical_path: string[]
  planning_notes: string[]
  provider: string
  model: string
  duration_ms: number
}

const priorityLabel = (priority: RequirementApiResponse['functional_requirements'][number]['priority']): Requirement['priority'] => priority.charAt(0).toUpperCase() + priority.slice(1) as Requirement['priority']
const statusLabel = (status: string): Task['status'] => status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Pending'

export const agentService = {
  getEngineStatus() {
    return apiKeyService.getAiEngineStatus()
  },
  async analyzeRequirements(project: Project): Promise<{ requirements: Requirement[]; analysis: RequirementApiResponse }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/agents/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { id: project.id, name: project.name, idea: project.idea, objective: project.objective, type: project.type, technologies: project.technologies, constraints: project.constraints, timeline: project.timeline, stage: project.stage } }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: string } | null
      throw new Error(body?.detail || `Requirement Agent request failed (${response.status})`)
    }
    const analysis = await response.json() as RequirementApiResponse
    const requirements = [
      ...analysis.functional_requirements.map((item, index) => ({ id: `FR-${String(index + 1).padStart(2, '0')}`, text: `${item.title}: ${item.description}`, kind: 'Functional' as const, priority: priorityLabel(item.priority), status: 'Validated' as const })),
      ...analysis.non_functional_requirements.map((item, index) => ({ id: `NFR-${String(index + 1).padStart(2, '0')}`, text: `${item.title}: ${item.description}`, kind: 'Non-functional' as const, priority: priorityLabel(item.priority), status: 'Needs review' as const })),
    ]
    return { requirements, analysis }
  },
  async generateArchitecture(project: Project): Promise<{ architecture: ArchitectureComponent[]; analysis: ArchitectureApiResponse }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/agents/architecture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { id: project.id, name: project.name, idea: project.idea, objective: project.objective, type: project.type, technologies: project.technologies, constraints: project.constraints, timeline: project.timeline, stage: project.stage } }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: { message?: string } | string } | null
      const detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message
      throw new Error(detail || `Architecture Agent request failed (${response.status})`)
    }
    const analysis = await response.json() as ArchitectureApiResponse
    const architecture = analysis.components.map(component => ({ id: component.id, name: component.name, status: 'Active', responsibility: component.responsibility, inputs: component.inputs, outputs: component.outputs, type: component.type, technology: component.technology, relatedRequirements: component.related_requirements }))
    return { architecture, analysis }
  },
  async generatePlan(project: Project) { return run(project.tasks) },
  async generatePlan(project: Project): Promise<{ tasks: Task[]; milestones: MilestoneData[]; analysis: PlannerApiResponse }> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/agents/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { id: project.id, name: project.name, idea: project.idea, objective: project.objective, type: project.type, technologies: project.technologies, constraints: project.constraints, timeline: project.timeline, stage: project.stage } }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: { code?: string; message?: string } | string } | null
      const detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message
      throw new Error(detail || `Planner Agent request failed (${response.status})`)
    }
    const analysis = await response.json() as PlannerApiResponse
    const criticalSet = new Set(analysis.critical_path)
    const milestoneMap = new Map(analysis.milestones.map(m => [m.id, m.title]))
    const tasks: Task[] = analysis.tasks.map(task => ({
      id: task.id,
      title: task.title,
      milestone: milestoneMap.get(task.milestone_id) || task.milestone_id,
      priority: priorityLabel(task.priority),
      status: statusLabel(task.status),
      successCriteria: task.success_criteria.join('; ') || task.description,
      estimatedEffort: task.estimated_effort,
      dependencies: task.dependencies,
      relatedRequirements: task.related_requirements,
      relatedComponents: task.related_components,
      successCriteriaList: task.success_criteria,
      isCriticalPath: criticalSet.has(task.id),
    }))
    const milestones: MilestoneData[] = analysis.milestones.map(m => ({ id: m.id, title: m.title, description: m.description, order: m.order }))
    return { tasks, milestones, analysis }
  },
  async reviewProject(project: Project): Promise<Risk[]> { return run(project.risks) },
  async generateTests(project: Project): Promise<TestCase[]> { return run(project.tests) },
  async getNextAction(project: Project) { return run(project.nextAction) },
  async createTaskFromFinding(_projectId: string, risk: Risk): Promise<Task> {
    const engine = apiKeyService.getAiEngineStatus()
    if (engine.activeKey) apiKeyService.validateApiKey(engine.activeKey.key)
    await wait(500)
    return { id: `T-${Date.now()}`, title: `Define fallback states for ${risk.title.toLowerCase()}`, milestone: 'Requirements & Design', priority: risk.severity, status: 'Pending', dependency: 'Safety state model', successCriteria: risk.recommendation }
  },
}

