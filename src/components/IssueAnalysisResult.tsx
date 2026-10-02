import { Plus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import type { IssueRecord, Project, Task } from '../types'
import { useState } from 'react'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'

export function IssueAnalysisResult({ issue, project, refresh }: { issue: IssueRecord, project: Project, refresh: () => void }) {
  const [addingTask, setAddingTask] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [recoveryMsg, setRecoveryMsg] = useState<{ text: string; isError?: boolean } | null>(null)
  const analysis = issue.analysis

  const addRecoveryTask = () => {
    setAddingTask(true)
    const newTask: Task = {
      id: `RECOVERY-${Date.now().toString().slice(-4)}`,
      title: analysis.recovery_task.title,
      milestone: 'Recovery',
      priority: 'High',
      status: 'Pending',
      dependency: issue.task_id,
      successCriteria: analysis.recovery_task.description,
    }
    projectService.addTask(newTask, project.id)
    
    const p = projectService.getProject(project.id)!
    analysis.blocked_tasks.forEach(blockedId => {
      const existing = p.tasks.find(t => t.id === blockedId)
      if (existing) {
        existing.status = 'Pending'
      }
    })
    projectService.saveProject(p)
    refresh()
    setTimeout(() => setAddingTask(false), 500)
  }

  const startAutonomousRecovery = async () => {
    setRecovering(true)
    setRecoveryMsg(null)
    try {
      await agentService.recoverIssue(project.id, issue.id)
      setRecoveryMsg({ text: 'Autonomous Issue Recovery started! Check Orchestrator panel for live progress.' })
      refresh()
    } catch (err: any) {
      setRecoveryMsg({ text: err.message || 'Failed to start recovery.', isError: true })
    } finally {
      setRecovering(false)
    }
  }

  return (
    <div className="panel issue-analysis-panel">
      <div className="panel-heading">
        <h2>AI ISSUE ANALYSIS</h2>
        <span className={`badge badge-${analysis.severity.toLowerCase()}`}>
          {analysis.severity.toUpperCase()}
        </span>
      </div>

      <div className="issue-section">
        <span className="eyebrow">Issue Summary</span>
        <p>{analysis.issue_summary}</p>
      </div>

      <div className="issue-section">
        <span className="eyebrow">Likely Causes</span>
        <ul className="cause-list">
          {analysis.likely_causes.map((cause, i) => (
            <li key={i}>{cause}</li>
          ))}
        </ul>
      </div>

      <div className="issue-section">
        <span className="eyebrow">Recommended Fix</span>
        <ol className="fix-list">
          {analysis.recommended_fix.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="issue-impact-grid">
        <div className="impact-col">
          <span className="eyebrow">Affected Requirements</span>
          {analysis.affected_requirements.length > 0 ? (
            analysis.affected_requirements.map(req => <div key={req} className="impact-tag">{req}</div>)
          ) : (
            <span className="muted">None</span>
          )}
        </div>
        <div className="impact-col">
          <span className="eyebrow">Affected Components</span>
          {analysis.affected_components.length > 0 ? (
            analysis.affected_components.map(comp => <div key={comp} className="impact-tag">{comp}</div>)
          ) : (
            <span className="muted">None</span>
          )}
        </div>
        <div className="impact-col">
          <span className="eyebrow">Blocked Tasks</span>
          {analysis.blocked_tasks.length > 0 ? (
            analysis.blocked_tasks.map(task => <div key={task} className="impact-tag">{task}</div>)
          ) : (
            <span className="muted">None</span>
          )}
        </div>
      </div>

      <div className="issue-section">
        <span className="eyebrow">Recommended Next Action</span>
        <p>{analysis.recommended_next_action}</p>
        <p><strong>Can other work continue?</strong> {analysis.can_continue_other_tasks ? 'Yes' : 'No'}</p>
      </div>

      <div className="issue-recovery-actions" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
        <span className="eyebrow" style={{ color: 'var(--cyan)' }}>Orchestrator Recovery</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-highlight"
            onClick={startAutonomousRecovery}
            disabled={recovering}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={14} />
            {recovering ? 'Starting Recovery Pipeline...' : 'Recover Autonomously'}
          </button>
          {analysis.recovery_task.needed && (
            <button className="btn btn-secondary" onClick={addRecoveryTask} disabled={addingTask}>
              {addingTask ? 'Added!' : <><Plus size={14} /> Add Recovery Task to Plan</>}
            </button>
          )}
        </div>
        {recoveryMsg && (
          <div style={{ fontSize: '12px', color: recoveryMsg.isError ? '#ff4d4d' : 'var(--lime)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {recoveryMsg.isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            <span>{recoveryMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  )
}
