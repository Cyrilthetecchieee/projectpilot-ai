with open("src/services/agentService.ts", "r", encoding="utf-8") as f:
    content = f.read()

orch_api = """
  async getOrchestratorStatus(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/orchestrator/status`);
    if (!res.ok) throw new Error('Failed to get status');
    return res.json();
  },
  async startOrchestrator(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/orchestrator/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start');
    return res.json();
  },
  async pauseOrchestrator(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/orchestrator/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause');
    return res.json();
  },
  async resumeOrchestrator(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/orchestrator/resume`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume');
    return res.json();
  },
  async stopOrchestrator(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/orchestrator/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop');
    return res.json();
  },
"""

if "getOrchestratorStatus" not in content:
    content = content.replace("async analyzeIssue", orch_api + "  async analyzeIssue")
    with open("src/services/agentService.ts", "w", encoding="utf-8") as f:
        f.write(content)
