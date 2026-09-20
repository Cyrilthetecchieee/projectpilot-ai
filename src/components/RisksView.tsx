import React, { useState, useMemo } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import type { Priority, Project, Risk } from '../types'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'
import './RisksView.css'

interface RisksViewProps {
  project: Project
  refresh: () => void
}

type SeverityFilter = 'All' | 'Critical' | 'High' | 'Medium' | 'Resolved' | 'Active'

export function RisksView({ project, refresh }: RisksViewProps) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All')
  const [sortBy, setSortBy] = useState<'severity' | 'title'>('severity')

  // Creating task state
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null)

  // Report Risk Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [newRisk, setNewRisk] = useState<{
    title: string
    severity: Priority
    detail: string
    recommendation: string
  }>({
    title: '',
    severity: 'High',
    detail: '',
    recommendation: '',
  })

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  // Executive KPIs
  const totalRisks = project.risks.length
  const criticalCount = useMemo(
    () => project.risks.filter(r => r.severity === 'Critical' && !r.resolved).length,
    [project.risks]
  )
  const highCount = useMemo(
    () => project.risks.filter(r => r.severity === 'High' && !r.resolved).length,
    [project.risks]
  )
  const resolvedCount = useMemo(
    () => project.risks.filter(r => r.resolved).length,
    [project.risks]
  )
  const activeCount = totalRisks - resolvedCount
  const resolutionRate = totalRisks > 0 ? Math.round((resolvedCount / totalRisks) * 100) : 100

  // Filtered & Sorted Risks
  const filteredRisks = useMemo(() => {
    return project.risks
      .filter(risk => {
        const matchesSearch =
          searchQuery === '' ||
          risk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          risk.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          risk.recommendation.toLowerCase().includes(searchQuery.toLowerCase())

        let matchesSeverity = true
        if (severityFilter === 'Resolved') {
          matchesSeverity = risk.resolved
        } else if (severityFilter === 'Active') {
          matchesSeverity = !risk.resolved
        } else if (severityFilter !== 'All') {
          matchesSeverity = risk.severity === severityFilter
        }

        return matchesSearch && matchesSeverity
      })
      .sort((a, b) => {
        if (sortBy === 'severity') {
          const weight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
          const diff = (weight[b.severity] || 0) - (weight[a.severity] || 0)
          if (diff !== 0) return diff
          return a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1
        }
        return a.title.localeCompare(b.title)
      })
  }, [project.risks, searchQuery, severityFilter, sortBy])

  // Run Continuous Review (AI Agent)
  const handleReviewProject = async () => {
    setRunning(true)
    setError('')
    try {
      const result = await agentService.reviewProject(project)
      const current = projectService.getProject(project.id)!
      projectService.saveProject({
        ...current,
        risks: result.risks,
        activity: [
          {
            id: `a-${Date.now()}`,
            agent: 'Reviewer Agent',
            action: 'Run Project Review',
            status: 'Completed',
            duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`,
            createdAt: 'Just now',
            model: result.analysis.model,
            provider: result.analysis.provider,
            summary: `Detected ${result.risks.length} engineering risks and safety boundaries`,
          },
          ...current.activity,
        ],
      })
      showToast('Continuous engineering review completed with Nemotron AI.')
      refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Project review could not be completed.'
      )
    } finally {
      setRunning(false)
    }
  }

  // Create Task in Execution Plan from Finding
  const handleCreateTaskFromFinding = async (risk: Risk) => {
    setCreatingTaskId(risk.id)
    try {
      const task = await agentService.createTaskFromFinding(project.id, risk)
      projectService.addTask(task, project.id)
      projectService.addActivity(
        {
          id: `a-${Date.now()}`,
          agent: 'Planner Agent',
          action: `Created task from risk: ${risk.title}`,
          status: 'Completed',
          duration: '0.8s',
          createdAt: 'Just now',
          provider: 'NVIDIA',
          model: 'nvidia/nemotron-3-ultra-550b-a55b',
        },
        project.id
      )
      showToast(`Added mitigation task "${task.title}" to execution plan.`)
      refresh()
    } catch (err) {
      showToast('Error generating task from finding.')
    } finally {
      setCreatingTaskId(null)
    }
  }

  // Toggle Resolved State
  const handleToggleResolved = (riskId: string, currentResolved: boolean) => {
    projectService.updateRisk(riskId, { resolved: !currentResolved }, project.id)
    showToast(currentResolved ? 'Risk marked active' : 'Risk marked resolved')
    refresh()
  }

  // Save New Risk
  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRisk.title.trim()) return

    const riskItem: Risk = {
      id: `RISK-${Date.now().toString().slice(-4)}`,
      title: newRisk.title.trim(),
      severity: newRisk.severity,
      detail: newRisk.detail.trim() || 'Custom risk item identified by engineering team.',
      recommendation: newRisk.recommendation.trim() || 'Implement mitigation and test scenarios.',
      resolved: false,
    }

    projectService.addRisk(riskItem, project.id)
    showToast(`Logged risk "${riskItem.title}"`)
    setIsReportModalOpen(false)
    setNewRisk({
      title: '',
      severity: 'High',
      detail: '',
      recommendation: '',
    })
    refresh()
  }

  // Delete Risk
  const handleDeleteRisk = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete risk "${title}"?`)) {
      projectService.deleteRisk(id, project.id)
      showToast(`Deleted risk`)
      refresh()
    }
  }

  return (
    <div className="risks-page">
      {/* Page Header */}
      <div className="risks-header-row">
        <div className="risks-header-left">
          <span className="eyebrow">CONTINUOUS ENGINEERING RADAR</span>
          <h1>Risks & Gaps</h1>
          <p>
            Automated risk identification, unverified architectural assumptions, and mitigation
            pathways continuously monitored by the Reviewer Agent.
          </p>
        </div>
        <div className="risks-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsReportModalOpen(true)}
          >
            <Plus size={15} />
            <span>Report Risk / Gap</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleReviewProject}
            disabled={running}
          >
            {running ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Running Review...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                <span>Run Project Review</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Executive KPI Metric Ribbon */}
      <div className="risks-kpi-grid">
        <div className="risks-kpi-card">
          <div className="risks-kpi-top">
            <span className="risks-kpi-label">TOTAL FINDINGS</span>
            <span className="risks-kpi-icon"><ShieldAlert size={15} /></span>
          </div>
          <div className="risks-kpi-val">{totalRisks}</div>
          <div className="risks-kpi-sub">{activeCount} active · {resolvedCount} resolved</div>
        </div>

        <div className="risks-kpi-card">
          <div className="risks-kpi-top">
            <span className="risks-kpi-label">CRITICAL RISKS</span>
            <span
              className="risks-kpi-icon"
              style={{
                color: criticalCount > 0 ? '#f87171' : 'var(--lime)',
                background: criticalCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(24, 43, 35, 0.7)',
                borderColor: criticalCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(54, 80, 57, 0.5)',
              }}
            >
              <AlertOctagon size={15} />
            </span>
          </div>
          <div className="risks-kpi-val" style={{ color: criticalCount > 0 ? '#f87171' : '#ffffff' }}>
            {criticalCount}
          </div>
          <div className="risks-kpi-sub">Immediate blocker threats</div>
        </div>

        <div className="risks-kpi-card">
          <div className="risks-kpi-top">
            <span className="risks-kpi-label">HIGH RISKS</span>
            <span
              className="risks-kpi-icon"
              style={{
                color: highCount > 0 ? '#fbbf24' : 'var(--lime)',
                background: highCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(24, 43, 35, 0.7)',
                borderColor: highCount > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(54, 80, 57, 0.5)',
              }}
            >
              <AlertTriangle size={15} />
            </span>
          </div>
          <div className="risks-kpi-val" style={{ color: highCount > 0 ? '#fbbf24' : '#ffffff' }}>
            {highCount}
          </div>
          <div className="risks-kpi-sub">Requires prioritized mitigation</div>
        </div>

        <div className="risks-kpi-card">
          <div className="risks-kpi-top">
            <span className="risks-kpi-label">RESOLUTION RATE</span>
            <span className="risks-kpi-icon"><CheckCircle2 size={15} /></span>
          </div>
          <div className="risks-kpi-val" style={{ color: 'var(--lime)' }}>{resolutionRate}%</div>
          <div className="risks-kpi-sub">{resolvedCount} of {totalRisks} closed</div>
        </div>

        <div className="risks-kpi-card">
          <div className="risks-kpi-top">
            <span className="risks-kpi-label">EXPOSURE HEALTH</span>
            <span className="risks-kpi-icon"><Zap size={15} /></span>
          </div>
          <div
            className="req-kpi-val"
            style={{
              fontSize: '18px',
              color: criticalCount === 0 ? 'var(--lime)' : '#f87171',
              marginTop: '4px',
            }}
          >
            {criticalCount === 0 ? (highCount === 0 ? 'Optimal' : 'Guarded') : 'Vulnerable'}
          </div>
          <div className="risks-kpi-sub">Real-time risk index</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="risks-toolbar">
        <div className="risks-toolbar-left">
          <div className="risks-search-box">
            <Search size={14} style={{ color: '#688279' }} />
            <input
              type="text"
              placeholder="Search findings, details, or recommended actions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="risks-pills">
            {(['All', 'Critical', 'High', 'Medium', 'Active', 'Resolved'] as SeverityFilter[]).map(
              filter => (
                <button
                  key={filter}
                  type="button"
                  className={`risks-pill-btn ${severityFilter === filter ? 'active' : ''}`}
                  onClick={() => setSeverityFilter(filter)}
                >
                  {filter}
                </button>
              )
            )}
          </div>
        </div>

        <div>
          <select
            className="req-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'severity' | 'title')}
          >
            <option value="severity">Sort by Severity (High to Low)</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="agent-error panel">
          <strong>Reviewer Agent could not complete the review.</strong>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={handleReviewProject}>
            Retry Review
          </button>
        </div>
      )}

      {/* Risks Grid */}
      <div className="risks-cards-grid">
        {filteredRisks.length === 0 ? (
          <div className="req-empty" style={{ gridColumn: '1 / -1' }}>
            <ShieldCheck size={36} style={{ color: 'var(--lime)' }} />
            <h3>No risks match your filter</h3>
            <p>All matching engineering risks are resolved or no entries matched your search criteria.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('')
                setSeverityFilter('All')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredRisks.map(risk => (
            <div
              className={`risk-item-card ${risk.resolved ? 'resolved' : risk.severity.toLowerCase()}`}
              key={risk.id}
            >
              <div>
                <div className="risk-card-top">
                  <span className={`priority-pill priority-pill-${risk.severity.toLowerCase()}`}>
                    <span className="priority-dot" />
                    {risk.severity} Severity
                  </span>

                  <div className="risk-meta-badge">
                    {risk.resolved ? (
                      <span className="badge badge-lime">RESOLVED</span>
                    ) : (
                      <span>Reviewer Agent · AI Telemetry</span>
                    )}
                  </div>
                </div>

                <div className="risk-card-body">
                  <h3>{risk.title}</h3>
                  <p>{risk.detail}</p>

                  <div className="risk-recom-box">
                    <div className="risk-recom-header">
                      <Sparkles size={11} />
                      <span>RECOMMENDED MITIGATION ACTION</span>
                    </div>
                    <p>{risk.recommendation}</p>
                  </div>
                </div>
              </div>

              <div className="risk-card-actions">
                <div className="risk-left-actions">
                  {!risk.resolved && (
                    <button
                      type="button"
                      className="risk-create-task-btn"
                      onClick={() => handleCreateTaskFromFinding(risk)}
                      disabled={creatingTaskId === risk.id}
                    >
                      {creatingTaskId === risk.id ? (
                        <>
                          <RefreshCw size={13} className="spin-icon" />
                          <span>Generating Task...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Create Task in Execution Plan</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                    onClick={() => handleToggleResolved(risk.id, risk.resolved)}
                  >
                    {risk.resolved ? 'Reopen' : 'Mark Resolved'}
                  </button>
                </div>

                <button
                  type="button"
                  className="req-icon-btn danger"
                  title={`Delete ${risk.id}`}
                  onClick={() => handleDeleteRisk(risk.id, risk.title)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Risk Modal */}
      {isReportModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => e.target === e.currentTarget && setIsReportModalOpen(false)}
        >
          <div className="technology-modal" role="dialog" aria-modal="true" style={{ width: 'min(580px, 100%)' }}>
            <button
              className="modal-close"
              onClick={() => setIsReportModalOpen(false)}
              aria-label="Close dialog"
            >
              <X size={17} />
            </button>
            <span className="eyebrow">CONTINUOUS REVIEW</span>
            <h2>Report Engineering Risk or Gap</h2>
            <p>Log an identified failure mode, interface mismatch, or safety boundary.</p>

            <form onSubmit={handleSaveRisk} className="req-modal-form">
              <div className="req-form-row">
                <label>
                  Risk Title / Vulnerability
                  <input
                    required
                    type="text"
                    value={newRisk.title}
                    onChange={e => setNewRisk({ ...newRisk, title: e.target.value })}
                    placeholder="e.g. Battery thermal runaway during rapid telemetry burst"
                  />
                </label>

                <label>
                  Severity
                  <select
                    value={newRisk.severity}
                    onChange={e => setNewRisk({ ...newRisk, severity: e.target.value as Priority })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
              </div>

              <label>
                Problem Details & Technical Context
                <textarea
                  required
                  rows={3}
                  value={newRisk.detail}
                  onChange={e => setNewRisk({ ...newRisk, detail: e.target.value })}
                  placeholder="Explain why this poses an operational, safety, or architectural risk..."
                />
              </label>

              <label>
                Recommended Mitigation Action
                <textarea
                  required
                  rows={3}
                  value={newRisk.recommendation}
                  onChange={e => setNewRisk({ ...newRisk, recommendation: e.target.value })}
                  placeholder="Proposed fix, fallback mode, or verification protocol to eliminate the risk..."
                />
              </label>

              <div className="req-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsReportModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Log Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Close toast">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
