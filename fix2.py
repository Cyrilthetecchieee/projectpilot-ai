import re

with open('src/services/agentService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("fetch(\\/api/projects/\\/agents/tests", "fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(project.id)}/agents/tests`")

with open('src/services/agentService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("id: `a-`,", "id: `a-${Date.now()}`,")
content = content.replace("duration: `ms`,", "duration: `${result.analysis.duration_ms}ms`,")
content = content.replace("summary: ` test cases generated`", "summary: `${result.tests.length} test cases generated`")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

