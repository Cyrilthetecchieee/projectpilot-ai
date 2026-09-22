import re

with open('src/services/initializationService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Project, Requirement, ArchitectureComponent, Task, Risk, TestCase, AgentRun", "Project, Requirement, ArchitectureComponent, Task, Risk, TestCase")

with open('src/services/initializationService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
