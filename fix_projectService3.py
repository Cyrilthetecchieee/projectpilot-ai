import re

with open('src/services/projectService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = "activity: (p.activity || []).filter((a: any) => a.provider && a.model && a.provider !== 'Local Mock' && a.model !== 'Simulation')"
replacement = "activity: (p.activity || []).filter((a: any) => !(a.provider === 'Local Mock' || a.model === 'Simulation' || (!a.provider && !a.model)))"

content = content.replace(target, replacement)

with open('src/services/projectService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
