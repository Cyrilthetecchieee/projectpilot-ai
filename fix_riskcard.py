import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = "projectService.addActivity({ id: `a-${Date.now()}`, agent: 'Planner Agent', action: `Created task from ${risk.title}`, status: 'Completed', duration: '1.2s', createdAt: 'Just now' }, project.id);"
replacement = "projectService.addActivity({ id: `a-${Date.now()}`, agent: 'Planner Agent', action: `Created task from ${risk.title}`, status: 'Completed', duration: '1.2s', createdAt: 'Just now', provider: 'NVIDIA', model: 'nvidia/nemotron-3-ultra-550b-a55b' }, project.id);"

content = content.replace(target, replacement)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
