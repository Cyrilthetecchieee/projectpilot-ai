import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  FileText,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TestTube2,
  X,
  Zap,
} from 'lucide-react'

interface AgentMeta {
  id: string
  step: string
  title: string
  subtitle: string
  stage: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  route: string
  capabilities: string[]
  accentColor: string
  sampleInput: string
  sampleArtifact: string
  sampleOutputItems: string[]
}

const AGENTS: AgentMeta[] = [
  {
    id: 'requirements',
    step: '01',
    title: 'Requirement Agent',
    subtitle: 'Scope & Specifications',
    stage: 'REQUIREMENTS',
    description: 'Transforms raw ideas into structured engineering requirements.',
    icon: FileText,
    route: '/project/smart-helmet/requirements',
    capabilities: ['Functional breakdown', 'Non-functional constraints', 'Assumptions validation'],
    accentColor: 'var(--lime)',
    sampleInput: 'Smart Helmet Safety System with fall detection and emergency alerts',
    sampleArtifact: 'Functional & Non-Functional Matrix (FR-01 to FR-08, NFR-01 to NFR-04)',
    sampleOutputItems: [
      'Decomposed raw ideas into 8 validated functional requirements',
      'Extracted critical latency constraint: <200ms impact-to-alert window',
      'Surfaced 3 implicit assumptions for hardware power budget',
    ],
  },
  {
    id: 'architecture',
    step: '02',
    title: 'Architecture Agent',
    subtitle: 'System & Interface Design',
    stage: 'ARCHITECTURE',
    description: 'Maps components, interfaces, responsibilities and data flow.',
    icon: Network,
    route: '/project/smart-helmet/architecture',
    capabilities: ['Component boundary mapping', 'Interface protocols', 'Traceable data flow'],
    accentColor: 'var(--cyan)',
    sampleInput: 'Requirements matrix for sensor telemetry, BLE communication, and cloud broker',
    sampleArtifact: 'Component Graph, Interface Protocols & Bus Topologies',
    sampleOutputItems: [
      'Mapped 4 hardware & software subsystems with zero interface conflicts',
      'Defined I2C sensor bus topology and fallback fail-safe state',
      'Generated end-to-end data flow sequence diagram',
    ],
  },
  {
    id: 'tasks',
    step: '03',
    title: 'Planner Agent',
    subtitle: 'Milestones & Tasks',
    stage: 'EXECUTION PLAN',
    description: 'Converts designs into milestones and actionable tasks.',
    icon: ClipboardCheck,
    route: '/project/smart-helmet/tasks',
    capabilities: ['Milestone sequencing', 'Dependency ordering', 'Measurable criteria'],
    accentColor: 'var(--lime)',
    sampleInput: 'Validated system components and interface dependencies',
    sampleArtifact: 'Sprint-Ready Milestones & Dependency Graphs',
    sampleOutputItems: [
      'Generated 4 execution phases across 14 technical milestones',
      'Mapped critical path for firmware bringup before cloud integration',
      'Assigned verified success criteria to all 14 execution tasks',
    ],
  },
  {
    id: 'risks',
    step: '04',
    title: 'Reviewer Agent',
    subtitle: 'Continuous Engineering Review',
    stage: 'CONTINUOUS REVIEW',
    description: 'Finds missing assumptions, contradictions and engineering risks.',
    icon: ShieldCheck,
    route: '/project/smart-helmet/risks',
    capabilities: ['Failure modes detection', 'Risk scoring', 'Auto-mitigations'],
    accentColor: 'var(--amber)',
    sampleInput: 'Full project context: requirements, architecture graph, and milestone schedule',
    sampleArtifact: 'Risk Matrix, Severity Ratings & Countermeasure Tasks',
    sampleOutputItems: [
      'Identified critical sensor dropout failure mode under high-vibration conditions',
      'Assigned High severity to unbuffered Bluetooth disconnection queue',
      'Synthesized automatic mitigation task and linked to sprint execution',
    ],
  },
  {
    id: 'testing',
    step: '05',
    title: 'Test Agent',
    subtitle: 'Verification & Quality',
    stage: 'VERIFICATION',
    description: 'Creates verification scenarios and measurable success criteria.',
    icon: TestTube2,
    route: '/project/smart-helmet/testing',
    capabilities: ['Edge-case scenarios', 'Pass/fail telemetry', 'Precondition matrix'],
    accentColor: 'var(--cyan)',
    sampleInput: 'Component specifications and safety state requirements',
    sampleArtifact: 'Verification Suite & Pass/Fail Test Scenarios',
    sampleOutputItems: [
      'Formulated 18 measurable verification scenarios with preconditions',
      'Created edge-case fault-injection test for low-battery telemetry',
      'Automated pass/fail criteria matching requirement FR-03',
    ],
  },
]

export function EngineeringAgentsSection() {
  const navigate = useNavigate()
  const [selectedAgent, setSelectedAgent] = useState<AgentMeta | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)

  const handleTileClick = (agent: AgentMeta) => {
    navigate(agent.route)
  }

  const handleInspect = (e: React.MouseEvent, agent: AgentMeta) => {
    e.stopPropagation()
    setSelectedAgent(agent)
    setIsSimulating(false)
    setSimulationProgress(0)
  }

  const runSimulation = () => {
    setIsSimulating(true)
    setSimulationProgress(20)
    setTimeout(() => setSimulationProgress(60), 600)
    setTimeout(() => setSimulationProgress(100), 1200)
    setTimeout(() => setIsSimulating(false), 1600)
  }

  return (
    <section className="section engineering-agents-section" id="agents">
      {/* Section Header */}
      <div className="section-intro">
        <span className="eyebrow">THE ENGINEERING TEAM</span>
        <h2>One workspace. Multiple engineering agents.</h2>
        <p>
          Specialized agents work together across the project lifecycle, leaving decisions and
          artifacts your team can inspect.
        </p>
      </div>

      {/* Lifecycle Flow Pipeline Tracker - Allocates the arrows correctly between stages */}
      <div className="agent-pipeline-flow-track" aria-label="Agent collaborative lifecycle workflow">
        <div className="pipeline-track-header">
          <span className="pipeline-track-label">
            <Sparkles size={13} style={{ color: 'var(--lime)' }} />
            COLLABORATIVE AGENT LIFECYCLE PIPELINE
          </span>
          <span className="pipeline-track-caption">
            Click any agent to launch its workspace view
          </span>
        </div>

        <div className="pipeline-flow-steps">
          {AGENTS.map((agent, index) => {
            const isLast = index === AGENTS.length - 1
            return (
              <React.Fragment key={agent.id}>
                <div
                  className="pipeline-flow-chip"
                  onClick={() => handleTileClick(agent)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleTileClick(agent)
                    }
                  }}
                  title={`Jump to ${agent.title}`}
                >
                  <span className="step-num">{agent.step}</span>
                  <span className="step-name">{agent.stage}</span>
                </div>

                {/* Arrow connecting each agent stage to the next - NO arrow after the last agent! */}
                {!isLast && (
                  <div className="pipeline-step-arrow" aria-hidden="true">
                    <ChevronRight size={15} />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* 5-Column Agent Grid with functional cards & correctly allocated action arrows */}
      <div className="agent-grid" role="list">
        {AGENTS.map((agent, index) => {
          const Icon = agent.icon
          const isLast = index === AGENTS.length - 1

          return (
            <div
              className="agent-tile"
              key={agent.title}
              role="button"
              tabIndex={0}
              onClick={() => handleTileClick(agent)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleTileClick(agent)
                }
              }}
              aria-label={`Open ${agent.title} workspace`}
            >
              {/* Top row: Icon Box on left, Step & Inspect badge on right */}
              <div className="agent-tile-top">
                <span className="icon-box" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <div className="agent-tile-badges">
                  <span className="step-badge">{agent.step}</span>
                  <button
                    type="button"
                    className="agent-inspect-btn"
                    onClick={e => handleInspect(e, agent)}
                    title={`Inspect ${agent.title} capabilities`}
                    aria-label={`Inspect ${agent.title}`}
                  >
                    Inspect
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="agent-tile-body">
                <h3>{agent.title}</h3>
                <p>{agent.description}</p>

                {/* Capabilities pills */}
                <div className="agent-caps-preview">
                  {agent.capabilities.slice(0, 2).map(cap => (
                    <span className="cap-tag" key={cap}>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pinned Card Action Footer: Arrow allocated cleanly at the bottom */}
              <div className="agent-tile-footer">
                <span className="agent-cta-text">Open Agent</span>
                <span className="agent-cta-arrow">
                  <ArrowRight size={14} className="agent-arrow-svg" />
                </span>
              </div>

              {/* Inter-card Pipeline Flow Arrow Indicator on right border (only between cards, not on last) */}
              {!isLast && (
                <div className="inter-card-arrow" aria-hidden="true" title="Hands off to next stage">
                  <ChevronRight size={13} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Agent Inspector & Simulation Modal */}
      {selectedAgent && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedAgent(null)}
          role="presentation"
        >
          <div
            className="modal-window agent-inspector-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-modal-title"
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">
                  <Zap size={13} style={{ color: 'var(--lime)' }} />
                  STAGE {selectedAgent.step} / {selectedAgent.stage}
                </span>
                <h2 id="agent-modal-title">{selectedAgent.title}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>
                  {selectedAgent.description}
                </p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setSelectedAgent(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Engine Attribution Strip */}
              <div className="agent-engine-pill">
                <BrainCircuit size={16} style={{ color: 'var(--lime)' }} />
                <span>AI Reasoning powered by <b>NVIDIA Nemotron</b> via Nebius Token Factory</span>
              </div>

              {/* Capabilities List */}
              <div style={{ margin: '18px 0' }}>
                <small
                  style={{
                    color: '#6e8883',
                    fontFamily: 'var(--mono)',
                    fontSize: '9.5px',
                    letterSpacing: '.08em',
                    display: 'block',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                  }}
                >
                  Core Agent Capabilities
                </small>
                <div className="modal-caps-grid">
                  {selectedAgent.capabilities.map(cap => (
                    <div className="modal-cap-item" key={cap}>
                      <Check size={12} style={{ color: 'var(--lime)', flexShrink: 0 }} />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Simulated Output Preview */}
              <div className="agent-sample-box">
                <div className="sample-box-header">
                  <span>
                    <Cpu size={13} /> PERSISTED ENGINEERING ARTIFACT
                  </span>
                  <span className="badge badge-lime">TRACEABLE</span>
                </div>
                <strong>{selectedAgent.sampleArtifact}</strong>
                <ul className="sample-findings-list">
                  {selectedAgent.sampleOutputItems.map(item => (
                    <li key={item}>
                      <ChevronRight size={12} style={{ color: 'var(--lime)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interactive Simulation Progress Bar */}
              {isSimulating && (
                <div className="simulation-progress-wrap" style={{ marginTop: '16px' }}>
                  <div className="sim-status-row">
                    <span>
                      <RefreshCw size={12} className="spin-icon" /> Executing {selectedAgent.title} reasoning loop...
                    </span>
                    <span>{simulationProgress}%</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${simulationProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Actions: Run Simulation & Launch Full Workspace */}
              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={runSimulation}
                  disabled={isSimulating}
                >
                  <Play size={14} />
                  {isSimulating ? 'Reasoning...' : 'Simulate Reasoning'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const route = selectedAgent.route
                    setSelectedAgent(null)
                    navigate(route)
                  }}
                >
                  Launch {selectedAgent.title} Workspace <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
