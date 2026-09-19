with open('src/services/agentService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

analyze_issue_method = """
  async analyzeIssue(projectId: string, taskId: string, description: string, imageFile?: File): Promise<any> {
    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/issues`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Issue Analysis failed');
    }
    
    return response.json();
  },
"""

if "analyzeIssue" not in content:
    content = content.replace("async createTaskFromFinding", analyze_issue_method + "  async createTaskFromFinding")

with open('src/services/agentService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
