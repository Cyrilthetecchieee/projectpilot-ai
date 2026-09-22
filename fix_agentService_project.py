with open('src/services/agentService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = "async analyzeIssue(projectId: string, taskId: string, description: string, imageFile?: File): Promise<any> {"
replacement = "async analyzeIssue(project: Project, taskId: string, description: string, imageFile?: File): Promise<any> {"
content = content.replace(target, replacement)

target2 = "formData.append('task_id', taskId);"
replacement2 = "formData.append('project_data', JSON.stringify(project));\n    formData.append('task_id', taskId);"
content = content.replace(target2, replacement2)

target3 = "encodeURIComponent(projectId)"
replacement3 = "encodeURIComponent(project.id)"
content = content.replace(target3, replacement3)

with open('src/services/agentService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
