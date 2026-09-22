import { useState, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  Clock,
  FileText,
  Info,
  Layers,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  TestTube2,
  X,
  Zap,
} from 'lucide-react'
import type { AgentRun, Project } from '../types'
import './AgentActivityView.css'

interface AgentActivityViewProps {
  project: Project
}

export function AgentActivityView({ project }: AgentActivityViewProps) {
  const [search, setSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Completed' | 'Needs attention'>('All')
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null)

  const runs: AgentRun[] = project.activity || []

  // Metrics
  const totalRuns = runs.length
  const completedRuns = runs.filter(r => r.status === 'Completed').length
  const attentionRuns = runs.filter(r => r.status !== 'Completed').length
  const uniqueAgents = Array.from(new Set(runs.map(r => r.agent)))

  // Filtering
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      if (selectedAgent !== 'All' && run.agent !== selectedAgent) return false
      if (selectedStatus !== 'All' && run.status !== selectedStatus) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchAgent = run.agent.toLowerCase().includes(q)
        const matchAction = run.action.toLowerCase().includes(q)
        const matchModel = (run.model || '').toLowerCase().includes(q)
        const matchProvider = (run.provider || '').toLowerCase().includes(q)
        const matchSummary = (run.summary || '').toLowerCase().includes(q)
        if (!matchAgent && !matchAction && !matchModel && !matchProvider && !matchSummary) {
          return false
        }
      }
      return true
    })
  }, [runs, selectedAgent, selectedStatus, search])

  const getAgentIcon = (agentName: string) => {
    if (agentName.includes('Requirement')) return FileText
    if (agentName.includes('Architecture')) return Network
    if (agentName.includes('Planner')) return Layers
    if (agentName.includes('Reviewer')) return ShieldCheck
    if (agentName.includes('Test')) return TestTube2
    return Bot
  }

  const getAgentRole = (agentName: string) => {
    if (agentName.includes('Requirement')) return 'Functional & System Specs'
    if (agentName.includes('Architecture')) return 'Component Topology & Data Flow'
    if (agentName.includes('Planner')) return 'Milestone & Dependency Graph'
    if (agentName.includes('Reviewer')) return 'Gap Analysis & Security Review'
    if (agentName.includes('Test')) return 'Verification & Test Synthesis'
    return 'Autonomous AI Specialist'
  }

  return (
    <div className="activity-view-container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <span className="eyebrow">AUDIT LOG & REASONING TRACE</span>
          <h1>Agent Activity</h1>
          <p>Trace real-time autonomous reasoning, execution durations, and model invocations across the project lifecycle.</p>
        </div>
      </div>

      {/* Executive Metric Strip */}
      <div className="activity-metrics-grid">
        <div className="activity-stat-card">
          <div className="stat-card-header">
            <span>TOTAL EXECUTIONS</span>
            <span className="dot-indicator dot-sky" />
          </div>
          <div className="stat-card-value">{totalRuns}</div>
          <small>Autonomous runs recorded</small>
        </div>

        <div className="activity-stat-card">
          <div className="stat-card-header">
            <span>SUCCESSFUL</span>
            <span className="dot-indicator dot-emerald" />
          </div>
          <div className="stat-card-value" style={{ color: '#84f279' }}>{completedRuns}</div>
          <small>Validated workflows completed</small>
        </div>

        <div className="activity-stat-card">
          <div className="stat-card-header">
            <span>NEEDS ATTENTION</span>
            <span className="dot-indicator dot-amber" />
          </div>
          <div className="stat-card-value" style={{ color: attentionRuns > 0 ? '#f87171' : '#a2b5af' }}>
            {attentionRuns}
          </div>
          <small>Pending review or retries</small>
        </div>

        <div className="activity-stat-card">
          <div className="stat-card-header">
            <span>ASSIGNED AGENTS</span>
            <span className="dot-indicator dot-lime" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--lime, #a7ff52)' }}>
            5
          </div>
          <small>Cooperative agent swarm</small>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="activity-toolbar">
        <div className="toolbar-search-wrap">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search activity by agent, action, reasoning summary, or model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="toolbar-filters">
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="filter-select"
            aria-label="Filter by agent"
          >
            <option value="All">All Agents ({totalRuns})</option>
            {uniqueAgents.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="filter-select"
            aria-label="Filter by status"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Needs attention">Needs Attention</option>
          </select>
        </div>
      </div>

      {/* Activity Table Panel */}
      <div className="panel activity-table-panel">
        <div className="activity-table-header">
          <span className="col-status-icon" aria-hidden="true" />
          <span className="col-agent">AGENT</span>
          <span className="col-action">ACTION & REASONING EVENT</span>
          <span className="col-model">MODEL</span>
          <span className="col-provider">PROVIDER</span>
          <span className="col-status">STATUS</span>
          <span className="col-duration">DURATION</span>
          <span className="col-time">TIME</span>
          <span className="col-actions">VIEW</span>
        </div>

        {filteredRuns.length === 0 ? (
          <div className="activity-empty-state">
            <Activity size={32} />
            <h3>No agent runs found</h3>
            <p>No activity records match your current search and filter criteria.</p>
          </div>
        ) : (
          <div className="activity-table-rows">
            {filteredRuns.map((run, i) => {
              const AgentIcon = getAgentIcon(run.agent)
              const isSuccess = run.status === 'Completed'

              return (
                <div
                  className="activity-table-row"
                  key={run.id || `${run.agent}-${i}`}
                  onClick={() => setActiveRun(run)}
                >
                  {/* Status Indicator Icon */}
                  <div className="col-status-icon">
                    <span className={`run-status-bullet ${isSuccess ? 'bullet-success' : 'bullet-warning'}`}>
                      {isSuccess ? <Check size={11} strokeWidth={3} /> : <AlertTriangle size={11} />}
                    </span>
                  </div>

                  {/* Agent Column */}
                  <div className="col-agent agent-identity-cell">
                    <span className="agent-avatar-box">
                      <AgentIcon size={14} />
                    </span>
                    <div className="agent-text-wrap">
                      <strong className="agent-title">{run.agent}</strong>
                      <span className="agent-role-caption">{getAgentRole(run.agent)}</span>
                    </div>
                  </div>

                  {/* Action Column */}
                  <div className="col-action action-details-cell">
                    <p className="action-title-text">{run.action}</p>
                    {run.summary && (
                      <span className="action-summary-text">{run.summary}</span>
                    )}
                  </div>

                  {/* Model Column */}
                  <div className="col-model">
                    <span className="model-tag-badge">
                      {run.model ? run.model.replace('nvidia/', '') : 'Nemotron-3-Super'}
                    </span>
                  </div>

                  {/* Provider Column */}
                  <div className="col-provider">
                    <span className="provider-pill-badge">
                      {run.provider === 'Google Gemini' && <Zap size={11} />}
                      {run.provider === 'NVIDIA' && <Sparkles size={11} />}
                      {run.provider || 'NVIDIA'}
                    </span>
                  </div>

                  {/* Status Column */}
                  <div className="col-status">
                    <span className={`status-pill ${isSuccess ? 'status-pill-completed' : 'status-pill-attention'}`}>
                      <span className="micro-status-dot" />
                      {run.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Duration Column */}
                  <div className="col-duration">
                    <span className="duration-pill">
                      <Clock size={10} />
                      {run.duration || '1.2s'}
                    </span>
                  </div>

                  {/* Time Column */}
                  <div className="col-time">
                    <span className="timestamp-text">{run.createdAt}</span>
                  </div>

                  {/* Action Details Button */}
                  <div className="col-actions">
                    <button
                      type="button"
                      className="btn-inspect-run"
                      onClick={e => {
                        e.stopPropagation()
                        setActiveRun(run)
                      }}
                      title="Inspect Run Telemetry"
                    >
                      <Info size={13} />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detailed Run Telemetry Modal */}
      {activeRun && (
        <div className="modal-backdrop" onClick={() => setActiveRun(null)}>
          <div className="modal-window activity-inspect-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">REASONING TELEMETRY · {activeRun.agent.toUpperCase()}</span>
                <h2>{activeRun.action}</h2>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setActiveRun(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-inspect-body">
              <div className="inspect-grid">
                <div className="inspect-item">
                  <small>EXECUTING AGENT</small>
                  <strong>{activeRun.agent}</strong>
                </div>

                <div className="inspect-item">
                  <small>EXECUTION STATUS</small>
                  <strong>
                    <span className={`status-pill ${activeRun.status === 'Completed' ? 'status-pill-completed' : 'status-pill-attention'}`}>
                      <span className="micro-status-dot" />
                      {activeRun.status.toUpperCase()}
                    </span>
                  </strong>
                </div>

                <div className="inspect-item">
                  <small>AI PROVIDER</small>
                  <strong>{activeRun.provider || 'NVIDIA'}</strong>
                </div>

                <div className="inspect-item">
                  <small>REASONING MODEL</small>
                  <code style={{ color: 'var(--lime, #a7ff52)', fontFamily: 'var(--mono)' }}>
                    {activeRun.model || 'nvidia/nemotron-3-super-120b-a12b'}
                  </code>
                </div>

                <div className="inspect-item">
                  <small>EXECUTION LATENCY</small>
                  <strong>{activeRun.duration || '1.4s'}</strong>
                </div>

                <div className="inspect-item">
                  <small>TIMESTAMP</small>
                  <strong>{activeRun.createdAt}</strong>
                </div>
              </div>

              {activeRun.summary && (
                <div className="inspect-section">
                  <small className="inspect-label">AGENT REASONING SUMMARY</small>
                  <p className="inspect-summary-box">{activeRun.summary}</p>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setActiveRun(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
