import re

with open('src/services/projectService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = "const read = (): Project[] => JSON.parse(localStorage.getItem(KEY) || '[]')"
replacement = """const read = (): Project[] => {
  const data = JSON.parse(localStorage.getItem(KEY) || '[]');
  return data.map((p: any) => ({
    ...p,
    activity: (p.activity || []).filter((a: any) => a.provider && a.model && a.provider !== 'Local Mock' && a.model !== 'Simulation')
  }));
}"""

content = content.replace(target, replacement)

with open('src/services/projectService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
