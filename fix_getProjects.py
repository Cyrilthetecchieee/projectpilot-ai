import re

with open('src/services/projectService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = "getProjects(): Project[] { const projects = read(); return projects.length ? projects : [clone(demoProject)] },"
replacement = """getProjects(): Project[] {
  const filterMock = (p: any) => ({ ...p, activity: (p.activity || []).filter((a: any) => !(a.provider === 'Local Mock' || a.model === 'Simulation' || (!a.provider && !a.model))) });
  const projects = read();
  return projects.length ? projects : [filterMock(clone(demoProject))] as Project[];
},"""

content = content.replace(target, replacement)

with open('src/services/projectService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
