import React, { useState, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  Link2,
  Network,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import type { ArchitectureComponent, Priority, Project } from '../types'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'
import './ArchitectureView.css'

interface ArchitectureViewProps {
  project: Project
  refresh: () => void
}

type ArchTab = 'connections' | 'dataflow' | 'decisions' | 'gaps'

const priorityLabel = (priority: string): Priority => {
  const p = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
  return (['Critical', 'High', 'Medium', 'Low'].includes(p) ? p : 'Medium') as Priority
}

export function ArchitectureView({ project, refresh }: ArchitectureViewProps) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState<ArchTab>('connections')

  // Selected Component for Deep Inspector
  const [selectedComponentId, setSelectedComponentId] = useState<string>(
    project.architecture[0]?.id || ''
  )

  // Add Component Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newComp, setNewComp] = useState<{
    name: string
    technology: string
    type: string
    responsibility: string
    inputs: string
    outputs: string
  }>({
    name: '',
    technology: 'React',
    type: 'Frontend',
    responsibility: '',
    inputs: 'User Actions, State',
    outputs: 'API Requests, DOM Updates',
  })

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  // Selected Component Object
  const selectedComponent = useMemo(() => {
    return (
      project.architecture.find(c => c.id === selectedComponentId) ||
      project.architecture[0] ||
      null
    )
  }, [project.architecture, selectedComponentId])

  // KPIs
  const totalComponents = project.architecture.length
  const connections = project.architectureConnections || []
  const dataFlow = project.architectureDataFlow || []
  const decisions = project.architectureDecisions || []
  const gaps = project.architectureGaps || []

  // Upstream and Downstream interfaces for selected component
  const connectedUpstream = useMemo(() => {
    if (!selectedComponent) return []
    return connections.filter(conn => conn.target === selectedComponent.id)
  }, [connections, selectedComponent])

  const connectedDownstream = useMemo(() => {
    if (!selectedComponent) return []
    return connections.filter(conn => conn.source === selectedComponent.id)
  }, [connections, selectedComponent])

  const getComponentName = (id: string) => {
    return project.architecture.find(c => c.id === id)?.name || id
  }

  // AI Generation Trigger
  const handleGenerateArchitecture = async () => {
    setRunning(true)
    setError('')
    try {
      const result = await agentService.generateArchitecture(project)
      const current = projectService.getProject(project.id)!
      projectService.saveProject({
        ...current,
        architecture: result.architecture,
        architectureConnections: result.analysis.connections,
        architectureDataFlow: result.analysis.data_flow,
        architectureDecisions: result.analysis.architecture_decisions,
        architectureGaps: result.analysis.architecture_gaps.map(gap => ({
          title: gap.title,
          severity: priorityLabel(gap.severity),
          reason: gap.reason,
          recommendedAction: gap.recommended_action,
        })),
        activity: [
          {
            id: `a-${Date.now()}`,
            agent: 'Architecture Agent',
            action: 'Generate System Architecture',
            status: 'Completed',
            duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`,
            createdAt: 'Just now',
            provider: result.analysis.provider,
            model: result.analysis.model,
            summary: `${result.architecture.length} modular components synthesized`,
          },
          ...current.activity,
        ],
      })
      showToast('System architecture synthesized from validated requirements.')
      if (result.architecture.length > 0) {
        setSelectedComponentId(result.architecture[0].id)
      }
      refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Architecture synthesis could not be completed.'
      )
    } finally {
      setRunning(false)
    }
  }

  // Handle Add Component
  const handleSaveComponent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComp.name.trim()) return

    const id = `COMP-${Date.now().toString().slice(-4)}`
    const component: ArchitectureComponent = {
      id,
      name: newComp.name.trim(),
      technology: newComp.technology.trim(),
      type: newComp.type.trim(),
      responsibility: newComp.responsibility.trim(),
      inputs: newComp.inputs.split(',').map(s => s.trim()).filter(Boolean),
      outputs: newComp.outputs.split(',').map(s => s.trim()).filter(Boolean),
      status: 'Active',
    }

    projectService.addComponent(component, project.id)
    showToast(`Added component ${component.name}`)
    setSelectedComponentId(id)
    setIsAddModalOpen(false)
    setNewComp({
      name: '',
      technology: 'React',
      type: 'Frontend',
      responsibility: '',
      inputs: '',
      outputs: '',
    })
    refresh()
  }

  // Delete Component
  const handleDeleteComponent = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete component "${name}"?`)) {
      projectService.deleteComponent(id, project.id)
      showToast(`Deleted ${name}`)
      const remaining = project.architecture.filter(c => c.id !== id)
      if (remaining.length > 0) {
        setSelectedComponentId(remaining[0].id)
      }
      refresh()
    }
  }

  return (
    <div className="arch-page">
      {/* Page Header */}
      <div className="arch-header-row">
        <div className="arch-header-left">
          <span className="eyebrow">SYSTEM DESIGN & TOPOLOGY</span>
          <h1>System Architecture</h1>
          <p>
            Modular component topology, traceable interface protocols, and end-to-end telemetry
            synthesized directly from validated system requirements.
          </p>
        </div>
        <div className="arch-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={15} />
            <span>Add Component</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleGenerateArchitecture}
            disabled={running}
          >
            {running ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Synthesizing Architecture...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Generate Architecture</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Executive KPI Metric Ribbon */}
      <div className="arch-kpi-grid">
        <div className="arch-kpi-card">
          <div className="arch-kpi-top">
            <span className="arch-kpi-label">SYSTEM COMPONENTS</span>
            <span className="arch-kpi-icon"><Cpu size={15} /></span>
          </div>
          <div className="arch-kpi-val">{totalComponents}</div>
          <div className="arch-kpi-sub">Modular architectural units</div>
        </div>

        <div className="arch-kpi-card">
          <div className="arch-kpi-top">
            <span className="arch-kpi-label">INTERFACE BOUNDARIES</span>
            <span className="arch-kpi-icon"><Share2 size={15} /></span>
          </div>
          <div className="arch-kpi-val" style={{ color: 'var(--lime)' }}>{connections.length}</div>
          <div className="arch-kpi-sub">Traceable system contracts</div>
        </div>

        <div className="arch-kpi-card">
          <div className="arch-kpi-top">
            <span className="arch-kpi-label">ARCHITECTURE GAPS</span>
            <span
              className="arch-kpi-icon"
              style={{
                color: gaps.length > 0 ? '#fbbf24' : 'var(--lime)',
                background: gaps.length > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(24, 43, 35, 0.7)',
                borderColor: gaps.length > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(54, 80, 57, 0.5)',
              }}
            >
              <AlertTriangle size={15} />
            </span>
          </div>
          <div className="arch-kpi-val" style={{ color: gaps.length > 0 ? '#fbbf24' : '#ffffff' }}>
            {gaps.length}
          </div>
          <div className="arch-kpi-sub">{gaps.length > 0 ? 'Requires attention' : 'Clean boundaries'}</div>
        </div>

        <div className="arch-kpi-card">
          <div className="arch-kpi-top">
            <span className="arch-kpi-label">DATA FLOW STEPS</span>
            <span className="arch-kpi-icon"><Zap size={15} /></span>
          </div>
          <div className="arch-kpi-val">{dataFlow.length}</div>
          <div className="arch-kpi-sub">End-to-end lifecycle path</div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="agent-error panel">
          <strong>Architecture Agent could not complete the design.</strong>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={handleGenerateArchitecture}>
            Retry Generation
          </button>
        </div>
      )}

      {/* Main Split Layout: Component Explorer & Deep Inspector */}
      <div className="arch-main-grid">
        {/* Left: Component Topology Grid */}
        <div className="arch-topology-panel">
          <div className="arch-panel-header">
            <div>
              <h3>Component Topology</h3>
              <span>Select any component to inspect structured specifications</span>
            </div>
            <span className="badge badge-lime">
              {totalComponents > 0 ? `${totalComponents} NODES` : 'EMPTY'}
            </span>
          </div>

          {totalComponents === 0 ? (
            <div className="req-empty">
              <Network size={34} style={{ color: '#4a675e' }} />
              <h3>No components generated yet</h3>
              <p>Run the Architecture Agent to decompose requirements into hardware and software components.</p>
              <button
                type="button"
                className="btn"
                onClick={handleGenerateArchitecture}
                disabled={running}
              >
                <Sparkles size={14} />
                <span>Generate Architecture</span>
              </button>
            </div>
          ) : (
            <div className="arch-nodes-container">
              {project.architecture.map((node, index) => {
                const isSelected = selectedComponent?.id === node.id
                const isLast = index === project.architecture.length - 1
                return (
                  <React.Fragment key={node.id}>
                    <div
                      className={`arch-node-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedComponentId(node.id)}
                    >
                      <span className="arch-node-idx">{String(index + 1).padStart(2, '0')}</span>
                      <div className="arch-node-info">
                        <div className="arch-node-title-row">
                          <strong>{node.name}</strong>
                          {node.technology && (
                            <span className="arch-node-tech">{node.technology}</span>
                          )}
                        </div>
                        <p className="arch-node-desc">
                          {node.responsibility || node.type || 'System module'}
                        </p>
                      </div>
                      <div className="arch-node-badges">
                        <span className="arch-io-counter" title="Inputs / Outputs count">
                          {node.inputs?.length || 0} in · {node.outputs?.length || 0} out
                        </span>
                        <ChevronRight size={16} style={{ color: isSelected ? 'var(--lime)' : '#537069' }} />
                      </div>
                    </div>

                    {!isLast && (
                      <div className="arch-node-connector">
                        <ChevronDown size={14} />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Deep Component Inspector */}
        <div className="arch-inspector-panel">
          {selectedComponent ? (
            <>
              <div className="arch-inspector-header">
                <div>
                  <span className="eyebrow">COMPONENT SPECIFICATION</span>
                  <h2>{selectedComponent.name}</h2>
                  <div className="arch-inspector-tags">
                    {selectedComponent.technology && (
                      <span className="arch-node-tech">{selectedComponent.technology}</span>
                    )}
                    {selectedComponent.type && (
                      <span className="req-tag">{selectedComponent.type}</span>
                    )}
                    <span className="badge badge-lime">{selectedComponent.status || 'Active'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="req-icon-btn danger"
                  title="Delete component"
                  onClick={() => handleDeleteComponent(selectedComponent.id, selectedComponent.name)}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="arch-inspector-section">
                <h4>PRIMARY RESPONSIBILITY</h4>
                <p>{selectedComponent.responsibility || 'No responsibility specified.'}</p>
              </div>

              <div className="arch-io-grid">
                <div className="arch-io-box">
                  <h5>INPUTS ({selectedComponent.inputs?.length || 0})</h5>
                  <div className="arch-io-chips">
                    {selectedComponent.inputs?.length ? (
                      selectedComponent.inputs.map(input => (
                        <span className="arch-io-chip in" key={input}>
                          <ChevronRight size={11} />
                          {input}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>No inputs defined</span>
                    )}
                  </div>
                </div>

                <div className="arch-io-box">
                  <h5>OUTPUTS ({selectedComponent.outputs?.length || 0})</h5>
                  <div className="arch-io-chips">
                    {selectedComponent.outputs?.length ? (
                      selectedComponent.outputs.map(output => (
                        <span className="arch-io-chip out" key={output}>
                          <ChevronRight size={11} />
                          {output}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>No outputs defined</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Connected Upstream & Downstream Interfaces */}
              <div className="arch-inspector-section">
                <h4>DATA CONTRACT CONNECTIONS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {connectedUpstream.map(u => (
                    <div className="arch-conn-row" key={`${u.source}-${u.target}`} style={{ padding: '8px 12px', background: '#08131d', borderRadius: '6px' }}>
                      <span><strong>{getComponentName(u.source)}</strong></span>
                      <span style={{ color: '#38bdf8' }}>→ Receives Data</span>
                      <span className="arch-protocol-pill">{u.interface || u.protocol}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{u.data}</span>
                    </div>
                  ))}

                  {connectedDownstream.map(d => (
                    <div className="arch-conn-row" key={`${d.source}-${d.target}`} style={{ padding: '8px 12px', background: '#08131d', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--lime)' }}>Emits Data →</span>
                      <span><strong>{getComponentName(d.target)}</strong></span>
                      <span className="arch-protocol-pill">{d.interface || d.protocol}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{d.data}</span>
                    </div>
                  ))}

                  {connectedUpstream.length === 0 && connectedDownstream.length === 0 && (
                    <p style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                      No direct connections mapped for this node yet.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="req-empty" style={{ padding: '40px 10px' }}>
              <Cpu size={28} style={{ color: '#4a675e' }} />
              <h3>Select a Component</h3>
              <p>Click any component on the left to view detailed responsibilities and interfaces.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Panels Tabs Navigation */}
      <div className="arch-tabs-nav">
        <button
          type="button"
          className={`arch-tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <Link2 size={15} />
          <span>Connections & Interfaces</span>
          <span className="arch-tab-count">{connections.length}</span>
        </button>

        <button
          type="button"
          className={`arch-tab-btn ${activeTab === 'dataflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('dataflow')}
        >
          <Activity size={15} />
          <span>End-to-End Data Flow</span>
          <span className="arch-tab-count">{dataFlow.length}</span>
        </button>

        <button
          type="button"
          className={`arch-tab-btn ${activeTab === 'decisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('decisions')}
        >
          <BrainCircuit size={15} />
          <span>Architecture Decisions</span>
          <span className="arch-tab-count">{decisions.length}</span>
        </button>

        <button
          type="button"
          className={`arch-tab-btn ${activeTab === 'gaps' ? 'active' : ''}`}
          onClick={() => setActiveTab('gaps')}
        >
          <AlertTriangle size={15} />
          <span>Interface Gaps</span>
          <span className="arch-tab-count">{gaps.length}</span>
        </button>
      </div>

      {/* Sub-Panel Content */}
      <div className="arch-tab-content-panel">
        {activeTab === 'connections' && (
          <div>
            <div className="arch-panel-header">
              <div>
                <h3>System Interface Contracts</h3>
                <span>Traceable communication protocols and payload data schemas</span>
              </div>
            </div>

            {connections.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '12px' }}>No connections generated yet.</p>
            ) : (
              <div className="arch-conn-table">
                <div className="arch-conn-header">
                  <span>SOURCE COMPONENT</span>
                  <span>TARGET COMPONENT</span>
                  <span>PROTOCOL / INTERFACE</span>
                  <span>PAYLOAD DATA SCHEMA</span>
                </div>
                {connections.map(c => (
                  <div className="arch-conn-row" key={`${c.source}-${c.target}-${c.interface}`}>
                    <strong>{getComponentName(c.source)}</strong>
                    <strong>{getComponentName(c.target)}</strong>
                    <div>
                      <span className="arch-protocol-pill">{c.interface || c.protocol || 'Custom'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#d2e3dc', display: 'block', marginBottom: '2px' }}>{c.data}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{c.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dataflow' && (
          <div>
            <div className="arch-panel-header">
              <div>
                <h3>Telemetry & Execution Pipeline</h3>
                <span>Sequential data propagation throughout the system</span>
              </div>
            </div>

            {dataFlow.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '12px' }}>No data flow pipeline generated yet.</p>
            ) : (
              <div className="arch-flow-list">
                {dataFlow.map(f => (
                  <div className="arch-flow-item" key={f.step}>
                    <span className="arch-flow-step">STEP {String(f.step).padStart(2, '0')}</span>
                    <p className="arch-flow-text">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'decisions' && (
          <div>
            <div className="arch-panel-header">
              <div>
                <h3>Architectural Decisions & Trade-Offs</h3>
                <span>Rationales captured by the Architecture Agent during synthesis</span>
              </div>
            </div>

            {decisions.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '12px' }}>No architectural decisions recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {decisions.map((d, i) => (
                  <div key={i} style={{ padding: '16px 18px', background: '#0d1b24', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-lime">DECISION</span>
                      <strong style={{ fontSize: '13px', color: '#ffffff' }}>{d.decision}</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#a8bcb5', lineHeight: 1.6 }}>
                      {d.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div>
            <div className="arch-panel-header">
              <div>
                <h3>Architecture Gaps & Mitigations</h3>
                <span>Potential design vulnerabilities and recommended corrective actions</span>
              </div>
            </div>

            {gaps.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '12px' }}>No architecture gaps identified.</p>
            ) : (
              <div className="arch-gaps-grid">
                {gaps.map((gap, i) => (
                  <div className={`arch-gap-card ${gap.severity.toLowerCase()}`} key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`priority-pill priority-pill-${gap.severity.toLowerCase()}`}>
                        <span className="priority-dot" />
                        {gap.severity} Severity
                      </span>
                    </div>
                    <h4>{gap.title}</h4>
                    <p>{gap.reason}</p>
                    <div className="arch-gap-action">
                      <strong style={{ color: 'var(--lime)', display: 'block', fontSize: '10px', marginBottom: '3px' }}>
                        RECOMMENDED ACTION
                      </strong>
                      {gap.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Component Modal */}
      {isAddModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => e.target === e.currentTarget && setIsAddModalOpen(false)}
        >
          <div className="technology-modal" role="dialog" aria-modal="true" style={{ width: 'min(580px, 100%)' }}>
            <button
              className="modal-close"
              onClick={() => setIsAddModalOpen(false)}
              aria-label="Close dialog"
            >
              <X size={17} />
            </button>
            <span className="eyebrow">NEW ARCHITECTURE NODE</span>
            <h2>Add System Component</h2>
            <p>Define a new hardware or software module within the system architecture topology.</p>

            <form onSubmit={handleSaveComponent} className="req-modal-form">
              <div className="req-form-row">
                <label>
                  Component Name
                  <input
                    required
                    type="text"
                    value={newComp.name}
                    onChange={e => setNewComp({ ...newComp, name: e.target.value })}
                    placeholder="e.g. Telemetry Ingestion Service"
                  />
                </label>

                <label>
                  Technology Stack
                  <input
                    type="text"
                    value={newComp.technology}
                    onChange={e => setNewComp({ ...newComp, technology: e.target.value })}
                    placeholder="e.g. ESP32 / FastAPI / React"
                  />
                </label>
              </div>

              <div className="req-form-row">
                <label>
                  Component Type
                  <select
                    value={newComp.type}
                    onChange={e => setNewComp({ ...newComp, type: e.target.value })}
                  >
                    <option value="Hardware / Sensor">Hardware / Sensor</option>
                    <option value="Embedded Firmware">Embedded Firmware</option>
                    <option value="Backend Service">Backend Service</option>
                    <option value="Frontend Application">Frontend Application</option>
                    <option value="Data Pipeline">Data Pipeline</option>
                    <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                  </select>
                </label>

                <label>
                  Inputs (comma separated)
                  <input
                    type="text"
                    value={newComp.inputs}
                    onChange={e => setNewComp({ ...newComp, inputs: e.target.value })}
                    placeholder="e.g. Sensor data, HTTP requests"
                  />
                </label>
              </div>

              <label>
                Outputs (comma separated)
                <input
                  type="text"
                  value={newComp.outputs}
                  onChange={e => setNewComp({ ...newComp, outputs: e.target.value })}
                  placeholder="e.g. WebSocket telemetry, Alerts"
                />
              </label>

              <label>
                Primary Responsibility
                <textarea
                  required
                  rows={3}
                  value={newComp.responsibility}
                  onChange={e => setNewComp({ ...newComp, responsibility: e.target.value })}
                  placeholder="Describe the architectural scope, operational guarantees, and boundaries of this component..."
                />
              </label>

              <div className="req-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save Component
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
