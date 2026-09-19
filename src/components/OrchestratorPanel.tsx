import { useEffect, useState } from 'react'
import { Play, Pause, Square, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, X, Activity } from 'lucide-react'
import { agentService } from '../services/agentService'
import type { OrchestratorRun } from '../types'

export function OrchestratorPanel({ projectId, onClose, onAction, refreshWorkspace }: { projectId: string, onClose: () => void, onAction: () => void, refreshWorkspace: () => void }) {
  const [run, setRun] = useState<OrchestratorRun | null>(null)
  
  const fetchStatus = async () => {
    try {
      const data = await agentService.getOrchestratorStatus(projectId)
      const isStatusChange = run && run.state !== data.state
      setRun(data)
      if (isStatusChange || data.state === 'READY') {
        refreshWorkspace() // Re-fetch the project payload when agents complete stages
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchStatus()
    const int = setInterval(fetchStatus, 2000)
    return () => clearInterval(int)
  }, [projectId])

  const handleStart = async () => {
    await agentService.startOrchestrator(projectId)
    onAction()
    fetchStatus()
  }

  const handlePause = async () => {
    await agentService.pauseOrchestrator(projectId)
    fetchStatus()
  }

  const handleResume = async () => {
    await agentService.resumeOrchestrator(projectId)
    fetchStatus()
  }

  const handleStop = async () => {
    await agentService.stopOrchestrator(projectId)
    fetchStatus()
    onClose()
  }

  if (!run) return null

  return (
    <div className="orchestrator-panel panel">
      <div className="orch-header">
        <div className="orch-title-block">
          <Activity size={18} className="text-lime" />
          <h2>ProjectPilot Orchestrator</h2>
        </div>
        <button className="btn-close-orch" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="orch-status-bar">
        <span>State: <strong className={`state-label state-${run.state.toLowerCase()}`}>{run.state}</strong></span>
        {run.is_running && <span className="orch-spinner"><RefreshCw size={14} className="spin-icon" /> Running</span>}
      </div>

      {run.state === 'INITIALIZED' && !run.is_running && (
        <div className="orch-start-prompt">
          <p>The Orchestrator will autonomously analyze your project, identify missing stages, and execute the appropriate specialist agents.</p>
          <button className="btn btn-highlight" onClick={handleStart}><Play size={15} /> Start Autonomous Run</button>
        </div>
      )}

      {run.state === 'READY' && (
        <div className="orch-ready">
          <CheckCircle2 size={32} className="text-lime" />
          <h3>AUTONOMOUS RUN COMPLETE</h3>
          <p>All stages have been successfully generated and reviewed.</p>
          <span className="badge badge-lime">READY FOR EXECUTION</span>
        </div>
      )}

      {(run.is_running || run.state === 'PAUSED' || run.state === 'FAILED' || run.state === 'BLOCKED') && (
        <div className="orch-active-view">
          
          <div className="orch-current-agent">
            <span className="eyebrow">CURRENT AGENT</span>
            <strong>{run.current_agent || 'System'}</strong>
          </div>

          <div className="orch-current-action">
            <span className="eyebrow">ACTION</span>
            <p>{run.current_action || 'Evaluating state'}</p>
          </div>

          {run.progress_steps.length > 0 && (
            <div className="orch-progress">
              {run.progress_steps.map((step, i) => (
                <div key={i} className="orch-step">
                  <CheckCircle2 size={13} className="text-lime" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}

          {run.human_input_required && (
            <div className="orch-human-input">
              <AlertTriangle size={18} className="text-amber" />
              <div>
                <strong>HUMAN INPUT REQUIRED</strong>
                <p>Reason: {run.human_input_reason}</p>
                <button className="btn btn-secondary mt-2" onClick={handlePause}>Acknowledge & Pause</button>
              </div>
            </div>
          )}

          {run.error_message && (
            <div className="orch-error">
              <strong>Failure Detected:</strong>
              <p>{run.error_message}</p>
            </div>
          )}

          <div className="orch-controls">
            {run.is_running ? (
              <button className="btn btn-secondary" onClick={handlePause}><Pause size={14} /> Pause Run</button>
            ) : (
              !run.human_input_required && run.state !== 'READY' && run.state !== 'FAILED' && (
                <button className="btn btn-highlight" onClick={handleResume}><Play size={14} /> Resume Autonomous Run</button>
              )
            )}
            <button className="btn btn-secondary" onClick={handleStop}><Square size={14} /> Stop Run</button>
          </div>
        </div>
      )}

      {run.decisions && run.decisions.length > 0 && (
        <div className="orch-decisions">
          <span className="eyebrow">ORCHESTRATOR DECISION LOG</span>
          <div className="decision-list">
            {run.decisions.slice(0, 5).map(dec => (
              <div key={dec.id} className="decision-item">
                <div className="dec-head">
                  <span className="dec-agent">{dec.agent}</span>
                  <ChevronRight size={12} className="text-muted" />
                  <span className="dec-action">{dec.action}</span>
                </div>
                <p className="dec-reason">{dec.reason}</p>
                <div className="dec-meta">
                  <span className={`dec-result \${dec.result === 'Success' ? 'text-lime' : 'text-amber'}`}>{dec.result}</span>
                  <span>{dec.timestamp.split('T')[1].substring(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
