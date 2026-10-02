import { useEffect, useState } from 'react'
import {
  Play,
  RotateCw,
  Square,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Sparkles,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Wrench,
  Brain,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { agentService } from '../services/agentService'
import type { OrchestratorRun, RetrievedMemory } from '../types'

const STAGES = [
  { id: 'Requirements', label: 'Requirements', agent: 'Requirement Agent' },
  { id: 'Architecture', label: 'Architecture', agent: 'Architecture Agent' },
  { id: 'Execution Plan', label: 'Execution Plan', agent: 'Planner Agent' },
  { id: 'Review', label: 'Review', agent: 'Reviewer Agent' },
  { id: 'Testing', label: 'Testing', agent: 'Test Agent' },
]

export function OrchestratorPanel({
  projectId,
  onClose,
  onAction,
  refreshWorkspace,
}: {
  projectId: string
  onClose: () => void
  onAction?: () => void
  refreshWorkspace: () => void
}) {
  const [run, setRun] = useState<OrchestratorRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [humanDecisionInput, setHumanDecisionInput] = useState('')
  const [showFindings, setShowFindings] = useState(false)
  const [memories, setMemories] = useState<RetrievedMemory[]>([])
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const data: OrchestratorRun = await agentService.getOrchestratorStatus(projectId)
      setRun(prev => {
        const isStatusChange = prev && prev.state !== data.state
        const newStages = data.completed_stages?.length || 0
        const prevStages = prev?.completed_stages?.length || 0
        if (isStatusChange || newStages !== prevStages || data.state === 'COMPLETED' || data.state === 'READY' || data.recovery_state === 'RECOVERY_COMPLETED') {
          refreshWorkspace()
        }
        return data
      })
      // Update memories from the orchestrator run's retrieved_memories or fallback to endpoint
      if (data.retrieved_memories && data.retrieved_memories.length > 0) {
        setMemories(data.retrieved_memories)
      } else if (data.is_running || data.state === 'COMPLETED' || data.state === 'READY') {
        const memData = await agentService.getProjectMemory(projectId)
        setMemories(memData)
      }
    } catch (e) {
      console.error('Failed to fetch orchestrator status:', e)
    }
  }

  useEffect(() => {
    fetchStatus()
    const int = setInterval(fetchStatus, 1500)
    return () => clearInterval(int)
  }, [projectId])

  const handleStart = async () => {
    setLoading(true)
    try {
      await agentService.startOrchestrator(projectId)
      if (onAction) onAction()
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      await agentService.retryOrchestrator(projectId)
      if (onAction) onAction()
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await agentService.stopOrchestrator(projectId)
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const handleProvideDecision = async () => {
    if (!humanDecisionInput.trim()) return
    setLoading(true)
    try {
      await agentService.provideHumanDecision(projectId, humanDecisionInput.trim())
      setHumanDecisionInput('')
      if (onAction) onAction()
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const handleContinueManually = async () => {
    setLoading(true)
    try {
      await agentService.continueOrchestratorManually(projectId)
      if (onAction) onAction()
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmIntervention = async () => {
    setLoading(true)
    try {
      await agentService.confirmManualIntervention(projectId)
      if (onAction) onAction()
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const handleRetryRecovery = async () => {
    setLoading(true)
    try {
      await agentService.retryRecovery(projectId)
      if (onAction) onAction()
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  const handleStopRecovery = async () => {
    setLoading(true)
    try {
      await agentService.stopRecovery(projectId)
      if (onAction) onAction()
      await fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  if (!run) return null

  const isRunning = run.is_running || run.state === 'RUNNING'
  const isCompleted = run.state === 'COMPLETED' || run.state === 'READY'
  const isPausedOrFailed = run.state === 'PAUSED' || run.state === 'FAILED'
  const isIdle = run.state === 'IDLE' || run.state === 'INITIALIZED'
  const isHumanDecisionRequired = run.human_input_required || !!run.human_decision_prompt
  const isMaxCorrectionsPaused = isPausedOrFailed && (run.last_error || '').includes('maximum self-correction')

  const isRecoveryActive = !!run.active_issue_id || (!!run.recovery_state && run.recovery_state !== '')
  const recoveryState = run.recovery_state || ''
  const recoveryType = run.recovery_type || 'PLAN_RECOVERY'
  const isRecoveryCompleted = recoveryState === 'RECOVERY_COMPLETED'
  const isManualIntervention = recoveryState === 'AWAITING_MANUAL_INTERVENTION' || !!run.manual_intervention_required
  const isRecoveryHumanDecision = recoveryState === 'AWAITING_HUMAN_DECISION'
  const isRecoveryFailed = recoveryState === 'RECOVERY_FAILED' || (isPausedOrFailed && (run.recovery_attempt || 0) >= (run.max_recovery_attempts || 2))

  const completedStages = new Set(run.completed_stages || [])
  const correctionCount = run.correction_count || 0
  const maxCorrections = run.max_corrections || 2
  const inCorrectionMode = correctionCount > 0

  const getRecoverySteps = () => {
    const steps: { id: string; label: string }[] = [
      { id: 'DIAGNOSING', label: 'Diagnosis' },
      { id: 'EVALUATING', label: 'Impact Analysis' },
    ]
    if (recoveryType === 'ARCHITECTURE_RECOVERY') {
      steps.push({ id: 'RECOVERING_ARCH', label: 'Architecture Fix' })
      steps.push({ id: 'RECOVERING_PLAN', label: 'Replanning' })
    } else if (recoveryType === 'PLAN_RECOVERY') {
      steps.push({ id: 'RECOVERING_PLAN', label: 'Replanning' })
    } else if (recoveryType === 'MANUAL_INTERVENTION_REQUIRED') {
      steps.push({ id: 'MANUAL_FIX', label: 'Manual Physical Fix' })
    } else if (recoveryType === 'HUMAN_DECISION_REQUIRED') {
      steps.push({ id: 'DECISION', label: 'Engineering Decision' })
      steps.push({ id: 'RECOVERING_PLAN', label: 'Replanning' })
    } else {
      steps.push({ id: 'RECOVERING_ACTION', label: 'Recovery Mitigation' })
    }
    if (recoveryType !== 'NO_ARTIFACT_CHANGE' && recoveryType !== 'MANUAL_INTERVENTION_REQUIRED') {
      steps.push({ id: 'REVIEWING', label: 'Re-review' })
    }
    steps.push({ id: 'VERIFYING', label: 'Targeted Verification' })
    return steps
  }

  const getRecoveryStepStatus = (_stepId: string, idx: number) => {
    let currentIdx = 0
    if (recoveryState === 'DIAGNOSING') currentIdx = 0
    else if (recoveryState === 'EVALUATING') currentIdx = 1
    else if (recoveryState === 'RECOVERING') {
      if (recoveryType === 'ARCHITECTURE_RECOVERY' && (run.current_agent === 'Planner Agent' || run.current_stage === 'Execution Plan')) {
        currentIdx = 3
      } else {
        currentIdx = 2
      }
    } else if (recoveryState === 'AWAITING_MANUAL_INTERVENTION' || recoveryState === 'AWAITING_HUMAN_DECISION') {
      currentIdx = 2
    } else if (recoveryState === 'REVIEWING') {
      currentIdx = getRecoverySteps().findIndex(s => s.id === 'REVIEWING')
    } else if (recoveryState === 'VERIFYING') {
      currentIdx = getRecoverySteps().findIndex(s => s.id === 'VERIFYING')
    } else if (recoveryState === 'RECOVERY_COMPLETED') {
      currentIdx = 999
    }

    if (isRecoveryCompleted || idx < currentIdx) {
      return {
        color: 'var(--lime)',
        isActive: false,
        icon: (
          <>
            <CheckCircle2 size={14} className="text-lime" />
            <span style={{ fontSize: '11px', color: 'var(--lime)' }}>✓</span>
          </>
        )
      }
    } else if (idx === currentIdx) {
      if (isRecoveryFailed) {
        return {
          color: '#ff4d4d',
          isActive: false,
          icon: <span style={{ fontSize: '11px', color: '#ff4d4d' }}>✕ Failed</span>
        }
      }
      if (isManualIntervention || isRecoveryHumanDecision) {
        return {
          color: '#f59e0b',
          isActive: true,
          icon: (
            <>
              <RefreshCw size={13} className="text-orange" />
              <span style={{ fontSize: '11px', color: '#f59e0b' }}>↻ Paused</span>
            </>
          )
        }
      }
      return {
        color: 'var(--cyan)',
        isActive: true,
        icon: (
          <>
            <RefreshCw size={13} className="spin-icon text-cyan" />
            <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>● Running</span>
          </>
        )
      }
    } else {
      return {
        color: 'var(--muted)',
        isActive: false,
        icon: <span style={{ fontSize: '12px', color: 'var(--muted)' }}>○</span>
      }
    }
  }

  return (
    <div className="orchestrator-panel panel">
      {/* Header */}
      <div className="orch-header">
        <div className="orch-title-block">
          {isRecoveryActive ? (
            <Wrench size={18} className="text-cyan" />
          ) : (
            <Sparkles size={18} className="text-lime" />
          )}
          <h2>
            {isRecoveryActive
              ? isRecoveryCompleted
                ? 'RECOVERY COMPLETE'
                : isManualIntervention
                ? 'MANUAL INTERVENTION REQUIRED'
                : isRecoveryHumanDecision
                ? 'HUMAN DECISION REQUIRED'
                : isRecoveryFailed
                ? 'RECOVERY PAUSED'
                : 'AUTONOMOUS ISSUE RECOVERY'
              : isCompleted
              ? 'AUTONOMOUS RUN COMPLETE'
              : isHumanDecisionRequired
              ? 'HUMAN DECISION REQUIRED'
              : inCorrectionMode && isRunning
              ? 'AUTONOMOUS RUN (SELF-CORRECTION)'
              : isRunning
              ? 'AUTONOMOUS RUN'
              : isPausedOrFailed
              ? 'Autonomous Run Paused'
              : 'ProjectPilot Orchestrator'}
          </h2>
        </div>
        <button className="btn-close-orch" onClick={onClose} title="Close panel">
          <X size={16} />
        </button>
      </div>

      {/* Recovery Metadata Ribbon (Phase 3) */}
      {isRecoveryActive && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Issue:{' '}
              <strong style={{ color: 'var(--text)' }}>
                {run.active_issue_id || 'Active Issue'}
              </strong>
            </span>
            <span
              className="badge"
              style={{
                fontSize: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--cyan)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              {recoveryType.replace(/_/g, ' ')}
            </span>
          </div>
          {run.recovery_attempt ? (
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              Autonomous Attempt: {run.recovery_attempt} / {run.max_recovery_attempts || 2}
            </div>
          ) : null}
        </div>
      )}

      {/* Visual Progression Card */}
      {isRecoveryActive ? (
        <div
          className="orch-stages-card"
          style={{
            background: 'var(--bg)',
            borderRadius: '8px',
            padding: '14px 16px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {getRecoverySteps().map((step, idx) => {
              const stepStatus = getRecoveryStepStatus(step.id, idx)
              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontFamily: 'var(--mono)',
                    color: stepStatus.color,
                  }}
                >
                  <span style={{ fontWeight: stepStatus.isActive ? 600 : 400 }}>{step.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {stepStatus.icon}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div
          className="orch-stages-card"
          style={{
            background: 'var(--bg)',
            borderRadius: '8px',
            padding: '14px 16px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STAGES.map(stage => {
              const isStageComplete = completedStages.has(stage.id)
              const isStageRunning =
                isRunning &&
                (run.current_stage === stage.id || run.current_agent === stage.agent)
              const isStageFailed =
                isPausedOrFailed &&
                (run.failed_stage === stage.agent || run.failed_stage === stage.id)

              let stageStatusLabel = <span style={{ fontSize: '12px', color: 'var(--muted)' }}>○</span>

              if (isStageComplete) {
                const isRevised = inCorrectionMode && (stage.id === 'Architecture' || stage.id === 'Execution Plan')
                stageStatusLabel = (
                  <>
                    <CheckCircle2 size={14} className="text-lime" />
                    <span style={{ fontSize: '11px', color: 'var(--lime)' }}>
                      {isRevised ? '✓ Revised' : '✓'}
                    </span>
                  </>
                )
              } else if (isStageRunning) {
                const isCorrecting = inCorrectionMode && run.correction_target === stage.agent
                const isReReviewing = inCorrectionMode && stage.id === 'Review'
                stageStatusLabel = (
                  <>
                    <RefreshCw size={13} className="spin-icon text-cyan" />
                    <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>
                      {isCorrecting ? '↻ Correcting' : isReReviewing ? '● Re-reviewing' : '● Running'}
                    </span>
                  </>
                )
              } else if (isStageFailed) {
                stageStatusLabel = (
                  <span style={{ fontSize: '11px', color: '#ff4d4d' }}>✕ Failed</span>
                )
              } else if (inCorrectionMode && stage.id === 'Execution Plan' && !completedStages.has('Execution Plan')) {
                stageStatusLabel = (
                  <span style={{ fontSize: '11px', color: 'var(--orange, #f59e0b)' }}>○ Rebuild required</span>
                )
              }

              return (
                <div
                  key={stage.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    fontFamily: 'var(--mono)',
                    color: isStageComplete
                      ? 'var(--lime)'
                      : isStageRunning
                      ? 'var(--cyan)'
                      : isStageFailed
                      ? '#ff4d4d'
                      : 'var(--muted)',
                  }}
                >
                  <span style={{ fontWeight: isStageRunning ? 600 : 400 }}>{stage.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {stageStatusLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ENGINEERING MEMORY SECTION */}
      <div
        style={{
          background: 'rgba(139, 92, 246, 0.05)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginTop: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: memories.length > 0 ? '10px' : '0',
          }}
        >
          <Brain size={15} style={{ color: '#a78bfa' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#a78bfa',
              textTransform: 'uppercase' as const,
            }}
          >
            Engineering Memory
          </span>
          {memories.length > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '10px',
                color: 'var(--muted)',
                background: 'rgba(139, 92, 246, 0.12)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              {memories.length} lesson{memories.length !== 1 ? 's' : ''} retrieved
            </span>
          )}
        </div>

        {memories.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--muted)', paddingLeft: '23px' }}>
            No relevant previous engineering lessons found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {memories.map((rm) => {
              const mem = rm.memory
              const isExpanded = expandedMemoryId === mem.memory_id
              const relevancePct = Math.round(rm.relevance_score * 100)
              const categoryColors: Record<string, string> = {
                architecture: '#38bdf8',
                planning: '#a78bfa',
                hardware: '#f59e0b',
                operational: '#22d3ee',
                requirements: '#818cf8',
                testing: '#34d399',
              }
              const catColor = categoryColors[mem.category.toLowerCase()] || '#a78bfa'

              return (
                <div
                  key={mem.memory_id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: isExpanded ? 'normal' : 'nowrap',
                        }}
                      >
                        {mem.problem_pattern}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: catColor,
                            background: `${catColor}18`,
                            padding: '1px 6px',
                            borderRadius: '8px',
                            border: `1px solid ${catColor}30`,
                            textTransform: 'capitalize' as const,
                          }}
                        >
                          {mem.category}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--muted)',
                          }}
                        >
                          Relevance: <strong style={{ color: relevancePct >= 70 ? 'var(--lime)' : relevancePct >= 50 ? '#f59e0b' : 'var(--muted)' }}>{relevancePct}%</strong>
                        </span>
                        {mem.status === 'ACTIVE' && (
                          <span
                            style={{
                              fontSize: '9px',
                              color: 'var(--lime)',
                              background: 'rgba(163, 230, 53, 0.1)',
                              padding: '1px 5px',
                              borderRadius: '6px',
                              border: '1px solid rgba(163, 230, 53, 0.2)',
                            }}
                          >
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason / Brief Summary */}
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--muted)',
                      marginTop: '6px',
                      lineHeight: 1.4,
                    }}
                  >
                    {rm.reason_retrieved}
                  </div>

                  {/* Expand / Collapse Toggle */}
                  <button
                    onClick={() => setExpandedMemoryId(isExpanded ? null : mem.memory_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a78bfa',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 0 0',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        background: 'rgba(139, 92, 246, 0.04)',
                        borderRadius: '4px',
                        border: '1px solid rgba(139, 92, 246, 0.12)',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#a78bfa' }}>Diagnosis:</strong>{' '}
                        <span style={{ color: 'var(--text)' }}>{mem.diagnosis}</span>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--lime)' }}>Successful Action:</strong>{' '}
                        <span style={{ color: 'var(--text)' }}>{mem.successful_action}</span>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--muted)' }}>Verification:</strong>{' '}
                        <span style={{ color: 'var(--text)' }}>{mem.verification_summary}</span>
                      </div>
                      {mem.technologies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                          {mem.technologies.map((tech, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '9px',
                                color: 'var(--cyan)',
                                background: 'rgba(56, 189, 248, 0.1)',
                                padding: '1px 5px',
                                borderRadius: '6px',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                              }}
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '2px',
                          color: 'var(--muted)',
                          fontSize: '10px',
                        }}
                      >
                        <span>Source: {mem.source_project_id}</span>
                        <span>Agent: {rm.agent_used_by}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          fontSize: '10px',
                          color: 'var(--muted)',
                        }}
                      >
                        <span>Confidence: {Math.round(mem.confidence * 100)}%</span>
                        <span>Retrieved: {mem.times_retrieved}×</span>
                        <span>Helpful: {mem.times_helpful}×</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PHASE 3: MANUAL INTERVENTION REQUIRED CARD */}
      {isRecoveryActive && isManualIntervention && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '6px',
            padding: '12px 14px',
            marginTop: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            <AlertTriangle size={16} />
            <span>MANUAL INTERVENTION REQUIRED</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '6px' }}>
            <strong>Likely Cause:</strong> {run.manual_intervention_prompt?.likely_cause}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--lime)', marginBottom: '8px' }}>
            <strong>Recommended Action:</strong> {run.manual_intervention_prompt?.recommended_action}
          </div>
          {run.manual_intervention_prompt?.affected_components && run.manual_intervention_prompt.affected_components.length > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
              <strong>Affected Components:</strong> {run.manual_intervention_prompt.affected_components.join(', ')}
            </div>
          )}
          {run.manual_intervention_prompt?.verification_required && (
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>
              <strong>Verification Required:</strong> {run.manual_intervention_prompt.verification_required}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-highlight"
              onClick={handleConfirmIntervention}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
            >
              <CheckCircle2 size={14} /> Mark Intervention Complete
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleStopRecovery}
              disabled={loading}
              style={{ justifyContent: 'center' }}
            >
              <Square size={14} /> Stop
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3 & PHASE 2: HUMAN DECISION REQUIRED CARD */}
      {isHumanDecisionRequired && isPausedOrFailed && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '6px',
            padding: '12px 14px',
            marginTop: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            <HelpCircle size={16} />
            <span>HUMAN DECISION REQUIRED</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>
            <strong>Question:</strong> {run.human_decision_prompt?.question || 'Please provide clarification.'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
            <strong>Affected Stage:</strong> {run.human_decision_prompt?.affected_stage || 'Requirements'}
          </div>
          {run.human_decision_prompt?.evidence && (
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', background: 'var(--bg)', padding: '6px 8px', borderRadius: '4px' }}>
              <strong>Reviewer Evidence:</strong> {run.human_decision_prompt.evidence}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              className="input-textarea"
              placeholder="Enter specific engineering decision or threshold..."
              value={humanDecisionInput}
              onChange={e => setHumanDecisionInput(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '12px',
                color: 'var(--text)',
                resize: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-highlight"
                onClick={handleProvideDecision}
                disabled={loading || !humanDecisionInput.trim()}
                style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
              >
                <ArrowRight size={14} /> Submit Decision & Resume
              </button>
              <button
                className="btn btn-secondary"
                onClick={isRecoveryActive ? handleStopRecovery : handleStop}
                disabled={loading}
                style={{ justifyContent: 'center' }}
              >
                <Square size={14} /> Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: RECOVERY COMPLETED */}
      {isRecoveryActive && isRecoveryCompleted && (
        <div className="orch-ready" style={{ padding: '14px 0 6px', textAlign: 'center' }}>
          <CheckCircle2 size={32} className="text-lime" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '15px' }}>RECOVERY COMPLETE</h3>
          <span className="badge badge-lime" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
            RESOLVED / READY FOR VERIFICATION
          </span>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--muted)',
              margin: '12px 0',
              textAlign: 'left',
              background: 'var(--bg)',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {recoveryType === 'ARCHITECTURE_RECOVERY' && <div>✓ Architecture revised</div>}
            {(recoveryType === 'ARCHITECTURE_RECOVERY' || recoveryType === 'PLAN_RECOVERY') && <div>✓ Execution plan updated</div>}
            {recoveryType !== 'NO_ARTIFACT_CHANGE' && recoveryType !== 'MANUAL_INTERVENTION_REQUIRED' && <div>✓ Reviewer passed</div>}
            <div>✓ Verification strategy generated</div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
          >
            Close Panel
          </button>
        </div>
      )}

      {/* PHASE 3: RECOVERY PAUSED / FAILED */}
      {isRecoveryActive && isRecoveryFailed && !isManualIntervention && !isHumanDecisionRequired && (
        <div
          style={{
            background: 'rgba(255, 77, 77, 0.08)',
            border: '1px solid rgba(255, 77, 77, 0.3)',
            borderRadius: '6px',
            padding: '12px 14px',
            marginTop: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4d', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
            <ShieldAlert size={16} />
            <span>RECOVERY PAUSED</span>
          </div>
          <div style={{ fontSize: '12px', color: '#ffb3b3', marginBottom: '8px' }}>
            {(run.recovery_attempt || 0) >= (run.max_recovery_attempts || 2)
              ? `Issue remains unresolved after ${run.recovery_attempt} autonomous recovery attempts.`
              : run.last_error || 'Recovery encountered an issue and paused.'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-highlight"
              onClick={handleRetryRecovery}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
            >
              <RotateCw size={13} /> Retry Recovery
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleStopRecovery}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
            >
              <Square size={13} /> Stop Recovery
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: RUNNING VIEW (WHEN ACTIVE AND NOT COMPLETED/FAILED/PAUSED) */}
      {isRecoveryActive && !isRecoveryCompleted && !isRecoveryFailed && !isManualIntervention && !isRecoveryHumanDecision && (
        <div className="orch-active-view" style={{ marginTop: '10px' }}>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.05em' }}>CURRENT AGENT:</div>
            <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{run.current_agent || 'Reviewer Agent'}</strong>
            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.05em' }}>ACTION:</div>
            <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>{run.current_action || 'Executing recovery stage...'}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleStopRecovery}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Square size={14} /> Stop Recovery
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: Self-Correction Info Card (Visible during correction or when review findings were handled) */}
      {!isRecoveryActive && inCorrectionMode && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginTop: '8px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600, color: 'var(--cyan)' }}>SELF-CORRECTION</span>
            <span style={{ color: 'var(--muted)' }}>
              Correction: {correctionCount} / {maxCorrections}
            </span>
          </div>
          <div style={{ color: 'var(--muted)' }}>
            Reviewer Iteration: <strong style={{ color: 'var(--text)' }}>{run.review_iteration || 1}</strong>
            {run.correction_target && (
              <> | Target: <strong style={{ color: 'var(--text)' }}>{run.correction_target}</strong></>
            )}
          </div>
          {run.unresolved_findings && run.unresolved_findings.length > 0 && (
            <div style={{ marginTop: '6px', color: 'var(--text)', fontSize: '11px' }}>
              <strong>Issue to resolve:</strong> {run.unresolved_findings[0].title}
            </div>
          )}
        </div>
      )}

      {/* PHASE 2: Success Notification after Correction */}
      {!isRecoveryActive && inCorrectionMode && run.review_decision === 'PASS' && isRunning && (
        <div
          style={{
            background: 'rgba(163, 230, 53, 0.08)',
            border: '1px solid rgba(163, 230, 53, 0.3)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--lime)',
          }}
        >
          <strong>REVIEW PASSED</strong>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            Self-corrections performed: {correctionCount}. Proceeding to Testing...
          </div>
        </div>
      )}

      {/* PHASE 2: Max Corrections Limit Reached */}
      {!isRecoveryActive && isMaxCorrectionsPaused && !isHumanDecisionRequired && (
        <div
          style={{
            background: 'rgba(255, 77, 77, 0.08)',
            border: '1px solid rgba(255, 77, 77, 0.3)',
            borderRadius: '6px',
            padding: '12px 14px',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4d', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
            <ShieldAlert size={16} />
            <span>AUTONOMOUS RUN PAUSED</span>
          </div>
          <div style={{ fontSize: '12px', color: '#ffb3b3', marginBottom: '8px' }}>
            Reviewer feedback remains unresolved after maximum self-correction attempts ({maxCorrections}).
          </div>

          {run.unresolved_findings && run.unresolved_findings.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowFindings(!showFindings)}
                style={{ width: '100%', justifyContent: 'center', fontSize: '11px', padding: '4px 8px' }}
              >
                {showFindings ? 'Hide Unresolved Findings' : `Review Findings (${run.unresolved_findings.length})`}
              </button>

              {showFindings && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {run.unresolved_findings.map((f, i) => (
                    <div key={i} style={{ background: 'var(--bg)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px' }}>
                      <span style={{ color: '#ff4d4d', fontWeight: 600 }}>[{f.severity?.toUpperCase()}]</span> {f.title}
                      <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '10px' }}>{f.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-highlight"
                onClick={handleRetry}
                disabled={loading}
                style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
              >
                <RotateCw size={13} /> Retry Correction
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleContinueManually}
                disabled={loading}
                style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
              >
                Continue Manually
              </button>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleStop}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
            >
              <Square size={13} /> Stop
            </button>
          </div>
        </div>
      )}

      {/* PHASE 1: Standard Idle View */}
      {!isRecoveryActive && isIdle && (
        <div className="orch-start-prompt" style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 14px' }}>
            Run the entire multi-agent pipeline autonomously with automated Reviewer self-correction.
          </p>
          <button
            className="btn btn-highlight"
            onClick={handleStart}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Play size={15} /> Run Autonomously
          </button>
        </div>
      )}

      {/* PHASE 1: Standard Running View */}
      {!isRecoveryActive && isRunning && (
        <div className="orch-active-view" style={{ marginTop: '10px' }}>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.05em' }}>CURRENT AGENT:</div>
            <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{run.current_agent || 'Orchestrator'}</strong>
            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.05em' }}>ACTION:</div>
            <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>{run.current_action || 'Running'}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleStop}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Square size={14} /> Stop
            </button>
          </div>
        </div>
      )}

      {/* PHASE 1: Standard Error / Pause View (not human decision and not max corrections) */}
      {!isRecoveryActive && isPausedOrFailed && !isHumanDecisionRequired && !isMaxCorrectionsPaused && (
        <div className="orch-active-view" style={{ marginTop: '10px' }}>
          <div style={{ background: 'rgba(255, 77, 77, 0.08)', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(255, 77, 77, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4d', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
              <AlertTriangle size={15} />
              <span>Failed Stage:</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
              {run.failed_stage || 'Unknown Agent'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.05em' }}>REASON:</div>
            <p style={{ fontSize: '12px', color: '#ffb3b3', margin: '4px 0 0', wordBreak: 'break-word' }}>
              {run.last_error || run.error_message || 'An unexpected error occurred during autonomous execution.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              className="btn btn-highlight"
              onClick={handleRetry}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <RotateCw size={14} /> Retry
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleStop}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Square size={14} /> Stop
            </button>
          </div>
        </div>
      )}

      {/* PHASE 1: Completed View */}
      {!isRecoveryActive && isCompleted && (
        <div className="orch-ready" style={{ padding: '14px 0 6px' }}>
          <CheckCircle2 size={32} className="text-lime" />
          <h3 style={{ margin: '8px 0 4px', fontSize: '15px' }}>AUTONOMOUS RUN COMPLETE</h3>
          <span className="badge badge-lime" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
            PROJECT READY FOR EXECUTION
          </span>
          {correctionCount > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
              Self-corrections completed: {correctionCount}
            </div>
          )}
          <div style={{ marginTop: '14px', width: '100%' }}>
            <button
              className="btn btn-secondary"
              onClick={handleStart}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
            >
              <RotateCw size={13} /> Re-run Autonomously
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
