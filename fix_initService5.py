import re

with open('src/services/initializationService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("AgentRun, Project", "Project")

with open('src/services/initializationService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
