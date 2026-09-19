import type { Project, Requirement, Risk, Task, TestCase } from '../types'
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

export const agentService = {
  getEngineStatus() {
    return apiKeyService.getAiEngineStatus()
  },
  async analyzeRequirements(project: Project): Promise<Requirement[]> { return run(project.requirements.length ? project.requirements : [{ id: 'FR-01', text: 'System shall detect and validate the primary safety state.', kind: 'Functional', priority: 'High', status: 'Validated' }]) },
  async generateArchitecture(project: Project) { return run(project.architecture) },
  async generatePlan(project: Project) { return run(project.tasks) },
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

