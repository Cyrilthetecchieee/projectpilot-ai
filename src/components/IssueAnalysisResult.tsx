import { Plus } from 'lucide-react'
import type { IssueRecord, Project, Task } from '../types'
import { useState } from 'react'
import { projectService } from '../services/projectService'

export function IssueAnalysisResult({ issue, project, refresh }: { issue: IssueRecord, project: Project, refresh: () => void }) {
  const [addingTask, setAddingTask] = useState(false)
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

      {analysis.recovery_task.needed && (
        <div className="recovery-task-prompt">
          <div className="recovery-info">
            <strong>Proposed Recovery Task</strong>
            <p>{analysis.recovery_task.title}</p>
            <small>Effort: {analysis.recovery_task.estimated_effort}</small>
          </div>
          <button className="btn btn-secondary" onClick={addRecoveryTask} disabled={addingTask}>
            {addingTask ? 'Added!' : <><Plus size={14} /> Add Recovery Task to Plan</>}
          </button>
        </div>
      )}
    </div>
  )
}
