import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BrainCircuit,
  Check,
  CheckCircle2,
  CircleDot,
  Code2,
  Cpu,
  ExternalLink,
  FileText,
  ListChecks,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import type { Project, Task } from '../types'
import { projectService } from '../services/projectService'

export interface TaskExecutionModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
  refresh: () => void
  targetTask?: Task | null
}

const NEXT_RECOMMENDED_ACTIONS = [
  {
    title: 'Implement disconnected state (T-10)',
    description: 'Implement firmware timer and interrupt logic to detect sensor disconnection within 500ms and switch to safe fault mode.',
    priority: 'Critical' as const,
    effort: '25–40 min',
    criteria: [
      'Disconnect detected within 500ms threshold',
      'Vehicle start is immediately revoked on signal loss',
      'Fault event is dispatched to diagnostic buffer',
    ],
  },
  {
    title: 'Build controller message handler (T-11)',
    description: 'Implement BLE/UART message verification, frame checksum validation, and heartbeat watchdog in the vehicle controller.',
    priority: 'High' as const,
    effort: '35–50 min',
    criteria: [
      'Valid messages update controller authorization state',
      'Heartbeat loss (>200ms) revokes authorization safely',
      'Corrupted CRC frames are logged and discarded',
    ],
  },
]

export function TaskExecutionModal({
  isOpen,
  onClose,
  project,
  refresh,
  targetTask,
}: TaskExecutionModalProps) {
  const navigate = useNavigate()

  // Identify active task either from prop or by matching nextAction to tasks list
  const activeTask = useMemo(() => {
    if (targetTask) return targetTask
    // Match T-04 or matching title for demo project
    const match = project.tasks.find(
      t =>
        t.id === 'T-04' ||
        t.title.toLowerCase().includes('fallback') ||
        t.title.toLowerCase() === project.nextAction.title.toLowerCase()
    )
    if (match) return match
    // Fallback virtual task representation
    return {
      id: 'T-04',
      title: project.nextAction.title,
      milestone: 'Requirements & Design',
      priority: project.nextAction.priority,
      status: 'Pending' as const,
      successCriteria: project.nextAction.criteria.join('; '),
      estimatedEffort: project.nextAction.effort,
      successCriteriaList: project.nextAction.criteria,
    }
  }, [project, targetTask])

  // Criteria list
  const criteriaList = useMemo(() => {
    if (targetTask?.successCriteriaList?.length) {
      return targetTask.successCriteriaList
    }
    if (targetTask?.successCriteria) {
      return targetTask.successCriteria.split(';').map(s => s.trim()).filter(Boolean)
    }
    return project.nextAction.criteria
  }, [project.nextAction.criteria, targetTask])

  // State
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({})
  const [taskStatus, setTaskStatus] = useState<Task['status']>(activeTask.status)
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [agentStep, setAgentStep] = useState(0)
  const [solutionGenerated, setSolutionGenerated] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Sync with activeTask changes
  useEffect(() => {
    if (isOpen) {
      const current = project.tasks.find(t => t.id === activeTask.id)
      const status = current?.status || activeTask.status
      setTaskStatus(status)
      if (status === 'Completed') {
        const all: Record<number, boolean> = {}
        criteriaList.forEach((_, idx) => {
          all[idx] = true
        })
        setCheckedCriteria(all)
        setSolutionGenerated(true)
      } else {
        setCheckedCriteria({})
        setSolutionGenerated(false)
      }
      setIsAgentRunning(false)
      setAgentStep(0)
      setToastMessage('')
    }
  }, [isOpen, activeTask.id, activeTask.status, project.tasks, criteriaList])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const toggleCriterion = (index: number) => {
    setCheckedCriteria(prev => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const checkedCount = criteriaList.filter((_, i) => checkedCriteria[i]).length
  const allCriteriaChecked = criteriaList.length > 0 && checkedCount === criteriaList.length

  // Start Task (Mark in progress)
  const handleStartTask = () => {
    const current = projectService.getProject(project.id)
    if (!current) return

    projectService.updateTask(activeTask.id, { status: 'In Progress' }, project.id)
    projectService.addActivity(
      {
        id: `a-${Date.now()}`,
        agent: 'Planner Agent',
        action: `Started task ${activeTask.id}: ${activeTask.title}`,
        status: 'Completed',
        duration: '0.6s',
        createdAt: 'Just now',
        provider: 'NVIDIA',
        model: 'Nemotron-4-340B-Instruct',
        summary: 'Task moved to In Progress. Engineering verification criteria active.',
      },
      project.id
    )
    setTaskStatus('In Progress')
    setToastMessage(`Task ${activeTask.id} is now In Progress`)
    refresh()
  }

  // Run AI Agent Execution
  const handleRunAgent = async () => {
    setIsAgentRunning(true)
    setAgentStep(1)

    // Multi-step agent thinking simulation
    await new Promise(r => setTimeout(r, 600))
    setAgentStep(2)
    await new Promise(r => setTimeout(r, 700))
    setAgentStep(3)
    await new Promise(r => setTimeout(r, 600))
    setAgentStep(4)
    await new Promise(r => setTimeout(r, 500))

    // Mark all criteria as checked
    const allChecked: Record<number, boolean> = {}
    criteriaList.forEach((_, idx) => {
      allChecked[idx] = true
    })
    setCheckedCriteria(allChecked)
    setSolutionGenerated(true)
    setIsAgentRunning(false)

    // Mark task in progress if pending
    if (taskStatus === 'Pending') {
      projectService.updateTask(activeTask.id, { status: 'In Progress' }, project.id)
      setTaskStatus('In Progress')
    }

    projectService.addActivity(
      {
        id: `a-${Date.now()}`,
        agent: 'Architecture Agent',
        action: `Synthesized fallback state machine for ${activeTask.id}`,
        status: 'Completed',
        duration: '2.4s',
        createdAt: 'Just now',
        provider: 'NVIDIA',
        model: 'Nemotron-4-340B-Instruct',
        summary: 'Defined explicit states: VALID, INVALID, DISCONNECTED, FAULT. 500ms timeout verified.',
      },
      project.id
    )
    refresh()
    setToastMessage('AI Agent synthesized solution and verified all criteria.')
  }

  // Complete Task & Advance Workflow
  const handleCompleteTask = () => {
    const current = projectService.getProject(project.id)
    if (!current) return

    // 1. Mark task completed
    const updatedTasks = current.tasks.map(t =>
      t.id === activeTask.id ? { ...t, status: 'Completed' as const } : t
    )

    // 2. Resolve risk r-01 if this was fallback states task
    const updatedRisks = current.risks.map(r =>
      r.id === 'r-01' || r.title.toLowerCase().includes('sensor failure')
        ? { ...r, resolved: true }
        : r
    )

    // 3. Mark TC-04 as passed
    const updatedTests = current.tests.map(t =>
      t.id === 'TC-04' || t.scenario.toLowerCase().includes('strap sensor disconnected')
        ? { ...t, status: 'Passed' as const }
        : t
    )

    // 4. Advance nextAction if this was nextAction
    let updatedNextAction = current.nextAction
    if (!targetTask || targetTask.id === activeTask.id) {
      const nextCandidate =
        NEXT_RECOMMENDED_ACTIONS.find(
          na => !updatedTasks.some(t => t.title.toLowerCase() === na.title.toLowerCase() && t.status === 'Completed')
        ) || NEXT_RECOMMENDED_ACTIONS[0]
      updatedNextAction = nextCandidate
    }

    // 5. Calculate new completion percentage
    const completedCount = updatedTasks.filter(t => t.status === 'Completed').length
    const completionPercentage = Math.round((completedCount / Math.max(updatedTasks.length, 1)) * 100)

    // 6. Log activity
    const newActivity = [
      {
        id: `a-${Date.now()}`,
        agent: 'Reviewer Agent',
        action: `Verified & Completed ${activeTask.id}: ${activeTask.title}`,
        status: 'Completed' as const,
        duration: '1.4s',
        createdAt: 'Just now',
        provider: 'NVIDIA',
        model: 'Nemotron-4-340B-Instruct',
        summary: `Success criteria verified. Risk r-01 marked resolved. Project completion now ${completionPercentage}%.`,
      },
      ...current.activity,
    ]

    projectService.saveProject({
      ...current,
      tasks: updatedTasks,
      risks: updatedRisks,
      tests: updatedTests,
      nextAction: updatedNextAction,
      completion: completionPercentage,
      activity: newActivity,
    })

    setTaskStatus('Completed')
    refresh()
    setToastMessage(`Task ${activeTask.id} marked complete! Completion updated to ${completionPercentage}%.`)

    setTimeout(() => {
      onClose()
    }, 1200)
  }

  const navigateToExecutionPlan = () => {
    onClose()
    navigate(`/project/${project.id}/tasks`)
  }

  return (
    <div className="modal-backdrop task-exec-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="task-exec-dialog" role="dialog" aria-modal="true" aria-labelledby="task-exec-title">
        {/* Header */}
        <div className="task-exec-header">
          <div className="task-exec-header-left">
            <span className="task-exec-eyebrow">
              <Sparkles size={13} className="text-lime" /> ACTIVE ENGINEERING TASK
            </span>
            <h2 id="task-exec-title" className="task-exec-title">
              {activeTask.title}
            </h2>
            <div className="task-exec-tags">
              <span className="task-id-badge">{activeTask.id}</span>
              <span className="badge badge-default">{activeTask.milestone}</span>
              <span className={`badge badge-${activeTask.priority.toLowerCase()}`}>{activeTask.priority}</span>
              {activeTask.estimatedEffort && (
                <span className="task-effort-badge">
                  <CircleDot size={10} /> {activeTask.estimatedEffort}
                </span>
              )}
              <span className={`task-status-pill status-${taskStatus.toLowerCase().replace(' ', '-')}`}>
                {taskStatus === 'Completed' ? '✓ Completed' : taskStatus === 'In Progress' ? '● In Progress' : '○ Pending'}
              </span>
            </div>
          </div>
          <button className="task-exec-close" onClick={onClose} aria-label="Close task execution modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="task-exec-body">
          {/* Notification Toast inside modal if active */}
          {toastMessage && (
            <div className="task-exec-toast">
              <CheckCircle2 size={15} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Context Card */}
          <div className="task-exec-section panel">
            <div className="task-section-head">
              <span className="eyebrow">PROBLEM & DESIGN CONTEXT</span>
              <span className="task-agent-badge">
                <BrainCircuit size={13} /> Assigned: Planner Agent & Architecture Agent
              </span>
            </div>
            <p className="task-desc">
              {project.nextAction.title === activeTask.title
                ? project.nextAction.description
                : activeTask.successCriteria || 'Establish verifiable engineering parameters and safe state behavior.'}
            </p>

            {/* Related Engineering Artifacts */}
            <div className="task-artifacts-grid">
              <div className="task-artifact-item">
                <span className="artifact-label">
                  <ShieldAlert size={12} className="text-amber" /> LINKED RISK
                </span>
                <strong>r-01 Sensor failure undefined</strong>
                <small>Disconnect or floating ground could trigger false start.</small>
              </div>
              <div className="task-artifact-item">
                <span className="artifact-label">
                  <FileText size={12} className="text-cyan" /> REQUIREMENT
                </span>
                <strong>FR-04 Disconnect Detection</strong>
                <small>System must detect sensor disconnection within 500ms.</small>
              </div>
              <div className="task-artifact-item">
                <span className="artifact-label">
                  <Cpu size={12} className="text-lime" /> COMPONENT
                </span>
                <strong>ac-02 Strap Sensor & Interlock</strong>
                <small>Hardware GPIO pull-down with active heartbeat.</small>
              </div>
            </div>
          </div>

          {/* Success Criteria Section */}
          <div className="task-exec-section panel">
            <div className="task-section-head">
              <div className="task-criteria-header-left">
                <span className="eyebrow">
                  <ListChecks size={13} /> SUCCESS CRITERIA VERIFICATION
                </span>
                <span className="criteria-counter">
                  {checkedCount} of {criteriaList.length} criteria satisfied
                </span>
              </div>
              <button
                type="button"
                className="btn-agent-run"
                onClick={handleRunAgent}
                disabled={isAgentRunning || taskStatus === 'Completed'}
              >
                {isAgentRunning ? (
                  <>
                    <RefreshCw size={13} className="spin-icon" /> Synthesizing with Nemotron...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} /> Run AI Agent Synthesis
                  </>
                )}
              </button>
            </div>

            {/* Agent progress bar if running */}
            {isAgentRunning && (
              <div className="task-agent-stepper">
                <div className="stepper-step active">
                  <span className="step-num">1</span>
                  <span>Hardware pinout analysis</span>
                </div>
                <div className={`stepper-step ${agentStep >= 2 ? 'active' : ''}`}>
                  <span className="step-num">2</span>
                  <span>FSM states formulation</span>
                </div>
                <div className={`stepper-step ${agentStep >= 3 ? 'active' : ''}`}>
                  <span className="step-num">3</span>
                  <span>500ms timeout validation</span>
                </div>
                <div className={`stepper-step ${agentStep >= 4 ? 'active' : ''}`}>
                  <span className="step-num">4</span>
                  <span>Code contract generation</span>
                </div>
              </div>
            )}

            {/* Checklist items */}
            <div className="criteria-checklist">
              {criteriaList.map((criterion, index) => {
                const isChecked = Boolean(checkedCriteria[index])
                return (
                  <label
                    key={criterion}
                    className={`criterion-row ${isChecked ? 'checked' : ''}`}
                    onClick={() => toggleCriterion(index)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Handled by label click
                      className="criterion-checkbox"
                    />
                    <span className="criterion-box-custom">
                      {isChecked && <Check size={12} />}
                    </span>
                    <span className="criterion-text">{criterion}</span>
                    <span className="criterion-badge">
                      {isChecked ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Generated Deliverable / Engineering Artifact */}
          {solutionGenerated && (
            <div className="task-exec-section panel solution-panel">
              <div className="task-section-head">
                <span className="eyebrow text-lime">
                  <Code2 size={13} /> SYNTHESIZED ENGINEERING DELIVERABLE
                </span>
                <span className="badge badge-lime">READY TO DEPLOY</span>
              </div>

              {/* State Machine Table */}
              <div className="fsm-table-wrap">
                <table className="fsm-table">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>Hardware Condition</th>
                      <th>ADC / Signal Range</th>
                      <th>Vehicle Authorization</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className="state-tag state-unknown">STATE_UNKNOWN</code></td>
                      <td>Booting / Unread</td>
                      <td>Floating / Initializing</td>
                      <td><span className="auth-denied">DENIED (0x00)</span></td>
                    </tr>
                    <tr>
                      <td><code className="state-tag state-valid">STATE_VALID</code></td>
                      <td>Helmet worn & strap clasped</td>
                      <td>10kΩ pull-up (1.5V–1.8V)</td>
                      <td><span className="auth-granted">GRANTED (0x01)</span></td>
                    </tr>
                    <tr>
                      <td><code className="state-tag state-invalid">STATE_INVALID</code></td>
                      <td>Helmet on, strap open</td>
                      <td>High-Z open switch (&gt;3.0V)</td>
                      <td><span className="auth-denied">DENIED (0x02)</span></td>
                    </tr>
                    <tr>
                      <td><code className="state-tag state-disc">STATE_DISCONNECTED</code></td>
                      <td>Cable severed / unplugged</td>
                      <td>Ground loop broken &gt;500ms</td>
                      <td><span className="auth-denied">DENIED (0x03)</span></td>
                    </tr>
                    <tr>
                      <td><code className="state-tag state-fault">STATE_FAULT</code></td>
                      <td>Short circuit / impedance drift</td>
                      <td>&lt;0.2V or &gt;3.1V</td>
                      <td><span className="auth-denied">LATCHED FAULT</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Firmware Code Contract */}
              <div className="code-contract-preview">
                <div className="code-header">
                  <span>firmware/safety_interlock.hpp</span>
                  <small>C++ (ESP32 ESP-IDF)</small>
                </div>
                <pre>
{`enum class StrapSafetyState : uint8_t {
  UNKNOWN      = 0x00, // Safe default on startup
  VALID        = 0x01, // Authorized: 10k pull-up verified
  INVALID      = 0x02, // Strap opened while worn
  DISCONNECTED = 0x03, // Cable pull-down severed (>500ms)
  FAULT        = 0x04  // Out-of-range ADC voltage
};

// Deterministic interlock evaluation (Deterministic O(1) fail-safe)
inline bool is_start_authorized(StrapSafetyState state) noexcept {
  return state == StrapSafetyState::VALID;
}`}
                </pre>
              </div>

              <div className="resolution-impact">
                <CheckCircle2 size={15} className="text-lime" />
                <span>
                  <strong>Traceability update:</strong> Resolves Risk <strong>r-01</strong>, verifies <strong>FR-04</strong>, and transitions <strong>TC-04</strong> to Passed.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="task-exec-footer">
          <div className="task-footer-left">
            <button type="button" className="btn-secondary-link" onClick={navigateToExecutionPlan}>
              <ExternalLink size={13} /> View in Execution Plan
            </button>
          </div>

          <div className="task-footer-right">
            {taskStatus === 'Pending' && (
              <button type="button" className="btn btn-secondary" onClick={handleStartTask}>
                <Play size={14} /> Mark as In Progress
              </button>
            )}

            {taskStatus !== 'Completed' ? (
              <button
                type="button"
                className={`btn btn-complete-task ${allCriteriaChecked ? 'btn-highlight' : ''}`}
                onClick={handleCompleteTask}
              >
                <Check size={16} /> Complete Task & Apply Updates
              </button>
            ) : (
              <div className="completed-pill">
                <Check size={14} /> Task Completed
              </div>
            )}

            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
