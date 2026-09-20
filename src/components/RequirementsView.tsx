import React, { useState, useMemo } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Edit2,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { Priority, Project, Requirement } from '../types'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'
import './RequirementsView.css'

interface RequirementsViewProps {
  project: Project
  refresh: () => void
}

type KindFilter = 'All' | 'Functional' | 'Non-functional'
type StatusFilter = 'All' | 'Validated' | 'Needs review' | 'Draft'

export function RequirementsView({ project, refresh }: RequirementsViewProps) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [contextExpanded, setContextExpanded] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<string>('All')

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingReq, setEditingReq] = useState<Requirement | null>(null)
  const [formData, setFormData] = useState<{
    id: string
    text: string
    kind: 'Functional' | 'Non-functional'
    priority: Priority
    status: 'Validated' | 'Needs review' | 'Draft'
  }>({
    id: '',
    text: '',
    kind: 'Functional',
    priority: 'High',
    status: 'Needs review',
  })

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  // Executive KPIs
  const totalCount = project.requirements.length
  const functionalCount = useMemo(
    () => project.requirements.filter(r => r.kind === 'Functional').length,
    [project.requirements]
  )
  const nonFunctionalCount = totalCount - functionalCount
  const validatedCount = useMemo(
    () => project.requirements.filter(r => r.status === 'Validated').length,
    [project.requirements]
  )
  const needsReviewCount = useMemo(
    () => project.requirements.filter(r => r.status === 'Needs review').length,
    [project.requirements]
  )
  const validationRate = totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0

  // Filtered Requirements
  const filteredRequirements = useMemo(() => {
    return project.requirements.filter(req => {
      const matchesSearch =
        searchQuery === '' ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.text.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesKind = kindFilter === 'All' || req.kind === kindFilter
      const matchesStatus = statusFilter === 'All' || req.status === statusFilter
      const matchesPriority = priorityFilter === 'All' || req.priority === priorityFilter

      return matchesSearch && matchesKind && matchesStatus && matchesPriority
    })
  }, [project.requirements, searchQuery, kindFilter, statusFilter, priorityFilter])

  // AI Agent Analysis Trigger
  const handleAnalyzeRequirements = async () => {
    setRunning(true)
    setError('')
    try {
      const result = await agentService.analyzeRequirements(project)
      const current = projectService.getProject(project.id)!
      projectService.saveProject({
        ...current,
        requirements: result.requirements,
        requirementProblem: result.analysis.problem,
        requirementConstraints: result.analysis.constraints,
        assumptions: result.analysis.assumptions,
        openQuestions: result.analysis.open_questions,
        activity: [
          {
            id: `a-${Date.now()}`,
            agent: 'Requirement Agent',
            action: 'Analyze Requirements',
            status: 'Completed',
            duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`,
            createdAt: 'Just now',
            provider: result.analysis.provider,
            model: result.analysis.model,
            summary: `${result.requirements.length} requirements structured`,
          },
          ...current.activity,
        ],
      })
      showToast('Requirements synthesized and validated with Nemotron AI.')
      refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Requirement analysis could not be completed.'
      )
    } finally {
      setRunning(false)
    }
  }

  // Open Add Modal with next available ID
  const handleOpenAddModal = () => {
    const nextNum = project.requirements.length + 1
    setFormData({
      id: `REQ-${String(nextNum).padStart(2, '0')}`,
      text: '',
      kind: 'Functional',
      priority: 'High',
      status: 'Draft',
    })
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (req: Requirement) => {
    setEditingReq(req)
    setFormData({
      id: req.id,
      text: req.text,
      kind: req.kind,
      priority: req.priority,
      status: req.status,
    })
  }

  // Save Requirement (Add or Edit)
  const handleSaveRequirement = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.text.trim()) return

    if (editingReq) {
      projectService.updateRequirement(
        editingReq.id,
        {
          text: formData.text.trim(),
          kind: formData.kind,
          priority: formData.priority,
          status: formData.status,
        },
        project.id
      )
      showToast(`Updated requirement ${editingReq.id}`)
      setEditingReq(null)
    } else {
      const newReq: Requirement = {
        id: formData.id.trim() || `REQ-${Date.now().toString().slice(-3)}`,
        text: formData.text.trim(),
        kind: formData.kind,
        priority: formData.priority,
        status: formData.status,
      }
      projectService.addRequirement(newReq, project.id)
      showToast(`Added requirement ${newReq.id}`)
      setIsAddModalOpen(false)
    }
    refresh()
  }

  // Quick Inline Status Update
  const handleStatusChange = (reqId: string, newStatus: Requirement['status']) => {
    projectService.updateRequirement(reqId, { status: newStatus }, project.id)
    showToast(`Status updated for ${reqId}`)
    refresh()
  }

  // Delete Requirement
  const handleDeleteRequirement = (reqId: string) => {
    if (window.confirm(`Are you sure you want to delete requirement ${reqId}?`)) {
      projectService.deleteRequirement(reqId, project.id)
      showToast(`Deleted ${reqId}`)
      refresh()
    }
  }

  return (
    <div className="requirements-page">
      {/* Header Row */}
      <div className="req-header-row">
        <div className="req-header-left">
          <span className="eyebrow">PROJECT INTELLIGENCE</span>
          <h1>System Requirements</h1>
          <p>
            Structured specifications defining operational constraints, functional guarantees,
            and verification boundaries powered by continuous AI analysis.
          </p>
        </div>
        <div className="req-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenAddModal}
          >
            <Plus size={15} />
            <span>Add Requirement</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleAnalyzeRequirements}
            disabled={running}
          >
            {running ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Analyzing System...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Analyze with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Executive KPI Metric Ribbon */}
      <div className="req-kpi-grid">
        <div className="req-kpi-card">
          <div className="req-kpi-top">
            <span className="req-kpi-label">TOTAL REQUIREMENTS</span>
            <span className="req-kpi-icon"><FileText size={15} /></span>
          </div>
          <div className="req-kpi-val">{totalCount}</div>
          <div className="req-kpi-sub">{functionalCount} func · {nonFunctionalCount} non-func</div>
        </div>

        <div className="req-kpi-card">
          <div className="req-kpi-top">
            <span className="req-kpi-label">VALIDATION RATE</span>
            <span className="req-kpi-icon"><FileCheck2 size={15} /></span>
          </div>
          <div className="req-kpi-val" style={{ color: 'var(--lime)' }}>{validationRate}%</div>
          <div className="req-kpi-sub">{validatedCount} verified of {totalCount}</div>
        </div>

        <div className="req-kpi-card">
          <div className="req-kpi-top">
            <span className="req-kpi-label">NEEDS REVIEW</span>
            <span className="req-kpi-icon" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}><CircleAlert size={15} /></span>
          </div>
          <div className="req-kpi-val" style={{ color: needsReviewCount > 0 ? '#fbbf24' : '#ffffff' }}>
            {needsReviewCount}
          </div>
          <div className="req-kpi-sub">Awaiting verification</div>
        </div>

        <div className="req-kpi-card">
          <div className="req-kpi-top">
            <span className="req-kpi-label">FUNCTIONAL</span>
            <span className="req-kpi-icon"><Layers size={15} /></span>
          </div>
          <div className="req-kpi-val">{functionalCount}</div>
          <div className="req-kpi-sub">Core capabilities</div>
        </div>

        <div className="req-kpi-card">
          <div className="req-kpi-top">
            <span className="req-kpi-label">NON-FUNCTIONAL</span>
            <span className="req-kpi-icon"><Filter size={15} /></span>
          </div>
          <div className="req-kpi-val">{nonFunctionalCount}</div>
          <div className="req-kpi-sub">Safety, quality, latency</div>
        </div>
      </div>

      {/* Problem Statement & Scope Briefing Card */}
      {(project.requirementProblem || project.constraints || project.assumptions?.length) && (
        <div className="req-context-card">
          <div
            className="req-context-header"
            onClick={() => setContextExpanded(prev => !prev)}
            role="button"
            tabIndex={0}
          >
            <div className="req-context-title">
              <span className="eyebrow" style={{ margin: 0 }}>PROBLEM SYNTHESIS & CONTEXT</span>
              <h3>Engineering Scope Briefing</h3>
            </div>
            <button
              type="button"
              className="req-context-toggle"
              aria-label={contextExpanded ? 'Collapse scope' : 'Expand scope'}
            >
              {contextExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {contextExpanded && (
            <div className="req-context-content">
              {project.requirementProblem && (
                <div className="req-problem-box">
                  <p>{project.requirementProblem}</p>
                </div>
              )}

              <div className="req-context-meta-grid">
                <div className="req-meta-col">
                  <h4>PROJECT CONSTRAINTS</h4>
                  {project.requirementConstraints?.length ? (
                    <div className="req-chips">
                      {project.requirementConstraints.map(c => (
                        <span className="req-tag" key={c}>{c}</span>
                      ))}
                    </div>
                  ) : (
                    <p>{project.constraints || 'No explicit constraints recorded.'}</p>
                  )}
                </div>

                <div className="req-meta-col">
                  <h4>ASSUMPTIONS</h4>
                  {project.assumptions?.length ? (
                    <div className="req-chips">
                      {project.assumptions.map(a => (
                        <span className="req-tag" key={a}>{a}</span>
                      ))}
                    </div>
                  ) : (
                    <p>Standard architectural assumptions apply.</p>
                  )}
                </div>

                <div className="req-meta-col">
                  <h4>OPEN QUESTIONS</h4>
                  {project.openQuestions?.length ? (
                    <div className="req-chips">
                      {project.openQuestions.map(q => (
                        <span className="req-tag" key={q}>{q}</span>
                      ))}
                    </div>
                  ) : (
                    <p>All core specifications currently resolved.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="req-toolbar">
        <div className="req-toolbar-left">
          <div className="req-search-box">
            <Search size={14} style={{ color: '#688279' }} />
            <input
              type="text"
              placeholder="Search by ID or specification keywords..."
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

          <div className="req-toolbar-filters">
            {(['All', 'Functional', 'Non-functional'] as KindFilter[]).map(kind => (
              <button
                key={kind}
                type="button"
                className={`req-pill-btn ${kindFilter === kind ? 'active' : ''}`}
                onClick={() => setKindFilter(kind)}
              >
                {kind}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            className="req-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="All">All Statuses</option>
            <option value="Validated">Validated</option>
            <option value="Needs review">Needs review</option>
            <option value="Draft">Draft</option>
          </select>

          <select
            className="req-select"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="agent-error panel">
          <strong>Requirement Agent could not complete the analysis.</strong>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={handleAnalyzeRequirements}>
            Retry Analysis
          </button>
        </div>
      )}

      {/* Requirements Table Container */}
      <div className="req-table-wrap">
        <div className="req-table-header">
          <span>ID</span>
          <span>REQUIREMENT SPECIFICATION</span>
          <span>TYPE</span>
          <span>PRIORITY</span>
          <span>STATUS</span>
          <span style={{ textAlign: 'right' }}>ACTIONS</span>
        </div>

        <div className="req-table-body">
          {filteredRequirements.length === 0 ? (
            <div className="req-empty">
              <FileText size={32} />
              <h3>No requirements match your filters</h3>
              <p>Adjust your search query or filter criteria, or add a new specification to this project.</p>
              <button type="button" className="btn btn-secondary" onClick={() => { setSearchQuery(''); setKindFilter('All'); setStatusFilter('All'); setPriorityFilter('All'); }}>
                Reset Filters
              </button>
            </div>
          ) : (
            filteredRequirements.map(req => (
              <div className="req-row-item" key={req.id}>
                <div>
                  <span className="req-id-tag">{req.id}</span>
                </div>
                <div className="req-text-col">
                  {req.text}
                </div>
                <div>
                  <span className="req-kind-badge">{req.kind}</span>
                </div>
                <div>
                  <span className={`priority-pill priority-pill-${req.priority.toLowerCase()}`}>
                    <span className="priority-dot" />
                    {req.priority}
                  </span>
                </div>
                <div>
                  <select
                    className={`req-status-select status-${req.status === 'Validated' ? 'validated' : req.status === 'Needs review' ? 'review' : 'draft'}`}
                    value={req.status}
                    onChange={e => handleStatusChange(req.id, e.target.value as Requirement['status'])}
                  >
                    <option value="Validated">Validated</option>
                    <option value="Needs review">Needs review</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                <div className="req-actions-cell">
                  <button
                    type="button"
                    className="req-icon-btn"
                    title={`Edit ${req.id}`}
                    onClick={() => handleOpenEditModal(req)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="req-icon-btn danger"
                    title={`Delete ${req.id}`}
                    onClick={() => handleDeleteRequirement(req.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Requirement Modal */}
      {(isAddModalOpen || editingReq) && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => e.target === e.currentTarget && (setIsAddModalOpen(false), setEditingReq(null))}
        >
          <div className="technology-modal" role="dialog" aria-modal="true" style={{ width: 'min(580px, 100%)' }}>
            <button
              className="modal-close"
              onClick={() => { setIsAddModalOpen(false); setEditingReq(null); }}
              aria-label="Close dialog"
            >
              <X size={17} />
            </button>
            <span className="eyebrow">{editingReq ? 'EDIT REQUIREMENT' : 'NEW SPECIFICATION'}</span>
            <h2>{editingReq ? `Edit Requirement ${editingReq.id}` : 'Add New Requirement'}</h2>
            <p>Define functional guarantees or operational constraints for your system engineering workspace.</p>

            <form onSubmit={handleSaveRequirement} className="req-modal-form">
              <div className="req-form-row">
                <label>
                  Requirement ID
                  <input
                    required
                    type="text"
                    value={formData.id}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    placeholder="REQ-01"
                  />
                </label>

                <label>
                  Category / Kind
                  <select
                    value={formData.kind}
                    onChange={e => setFormData({ ...formData, kind: e.target.value as 'Functional' | 'Non-functional' })}
                  >
                    <option value="Functional">Functional</option>
                    <option value="Non-functional">Non-functional</option>
                  </select>
                </label>
              </div>

              <div className="req-form-row">
                <label>
                  Priority
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'Validated' | 'Needs review' | 'Draft' })}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Needs review">Needs review</option>
                    <option value="Validated">Validated</option>
                  </select>
                </label>
              </div>

              <label>
                Requirement Specification Text
                <textarea
                  required
                  rows={4}
                  value={formData.text}
                  onChange={e => setFormData({ ...formData, text: e.target.value })}
                  placeholder="E.g. System shall detect collision impact within 50ms and trigger secondary cellular emergency protocol..."
                />
              </label>

              <div className="req-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsAddModalOpen(false); setEditingReq(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  {editingReq ? 'Update Requirement' : 'Save Requirement'}
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
