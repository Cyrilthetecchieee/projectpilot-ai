import { demoProject } from '../data/demoProject'
import type { Project, Task, Requirement, TestCase, AgentRun } from '../types'

const KEY = 'projectpilot.projects'
const read = (): Project[] => JSON.parse(localStorage.getItem(KEY) || '[]')
const write = (projects: Project[]) => localStorage.setItem(KEY, JSON.stringify(projects))
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

export const projectService = {
  getProjects(): Project[] { const projects = read(); return projects.length ? projects : [clone(demoProject)] },
  getProject(id: string): Project | undefined { return this.getProjects().find(project => project.id === id) },
  saveProject(project: Project): Project { const projects = this.getProjects().filter(item => item.id !== project.id); write([...projects, project]); return project },
  createProject(input: Pick<Project, 'name' | 'idea' | 'objective' | 'type' | 'technologies' | 'constraints' | 'timeline' | 'stage'>): Project { const project: Project = { ...clone(demoProject), ...input, id: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`, requirements: [], architecture: [], tasks: [], risks: [], tests: [], activity: [], completion: 0 }; return this.saveProject(project) },
  updateTask(id: string, task: Partial<Task>, projectId: string): Project { const project = clone(this.getProject(projectId)!); project.tasks = project.tasks.map(item => item.id === id ? { ...item, ...task } : item); project.completion = Math.round(project.tasks.filter(item => item.status === 'Completed').length / Math.max(project.tasks.length, 1) * 100); return this.saveProject(project) },
  addTask(task: Task, projectId: string): Project { const project = clone(this.getProject(projectId)!); project.tasks.push(task); return this.saveProject(project) },
  updateRequirement(id: string, requirement: Partial<Requirement>, projectId: string): Project { const project = clone(this.getProject(projectId)!); project.requirements = project.requirements.map(item => item.id === id ? { ...item, ...requirement } : item); return this.saveProject(project) },
  updateTestCase(id: string, test: Partial<TestCase>, projectId: string): Project { const project = clone(this.getProject(projectId)!); project.tests = project.tests.map(item => item.id === id ? { ...item, ...test } : item); return this.saveProject(project) },
  addActivity(activity: AgentRun, projectId: string): Project { const project = clone(this.getProject(projectId)!); project.activity = [activity, ...project.activity]; return this.saveProject(project) },
  resetDemo(): Project { return this.saveProject(clone(demoProject)) },
}
