with open('src/components/ReportIssueModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = "const issue = await agentService.analyzeIssue(project.id, task.id, description, imageFile || undefined)"
replacement = "const issue = await agentService.analyzeIssue(project, task.id, description, imageFile || undefined)"
content = content.replace(target, replacement)

with open('src/components/ReportIssueModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
