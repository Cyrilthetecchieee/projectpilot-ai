import sys
import re

with open('src/services/agentService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace generateTests method
target = "  async generateTests(project: Project): Promise<TestCase[]> { return run(project.tests) },"
replacement = '''
  async generateTests(project: Project): Promise<{ tests: TestCase[]; analysis: any }> {
    const response = await fetch(\/api/projects/\/agents/tests, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { id: project.id, name: project.name, idea: project.idea, objective: project.objective, type: project.type, technologies: project.technologies, constraints: project.constraints, timeline: project.timeline, stage: project.stage } }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail?.message || err.detail || 'Test Agent failed')
    }
    const analysis = await response.json()
    apiKeyService.recordLiveAiExecution(analysis.provider, analysis.model)
    const tests: TestCase[] = analysis.test_cases.map((t: any, idx: number) => ({
      id: TC-\,
      scenario: t.scenario,
      precondition: t.precondition,
      expected: t.expected_result,
      status: 'Pending',
    }))
    return { tests, analysis }
  },'''

if target in content:
    content = content.replace(target, replacement.lstrip('\n'))
else:
    print("Could not find target in agentService.ts!")

with open('src/services/agentService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('agentService.ts updated')

