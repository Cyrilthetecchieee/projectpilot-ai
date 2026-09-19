import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  ExternalLink,
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
  handoffTo: string
  receivesFrom: string
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
    receivesFrom: 'Raw problem statement, team constraints, and project objectives',
    handoffTo: 'Architecture Agent for subsystem decomposition and interface contracts',
    icon: FileText,
    route: '/project/smart-helmet/requirements',
    capabilities: [
      'Functional requirement breakdown (FR-01 to FR-08)',
      'Non-functional safety and performance constraints',
      'Assumptions extraction & open ambiguity detection',
    ],
    accentColor: 'var(--lime)',
    sampleInput: 'Smart Helmet Safety System with fall detection, emergency GPS alerts, and BLE sync',
    sampleArtifact: 'Functional & Non-Functional Matrix (FR-01 to FR-08, NFR-01 to NFR-04)',
    sampleOutputItems: [
      'Decomposed raw ideas into 8 validated functional requirements with test criteria',
      'Extracted critical latency constraint: <200ms impact-to-emergency-alert window',
      'Surfaced 3 implicit assumptions regarding accelerometer sampling frequency & battery budget',
    ],
  },
  {
    id: 'architecture',
    step: '02',
    title: 'Architecture Agent',
    subtitle: 'System & Interface Design',
    stage: 'ARCHITECTURE',
    description: 'Maps components, interfaces, responsibilities and data flow.',
    receivesFrom: 'Validated functional and non-functional requirements from Requirement Agent',
    handoffTo: 'Planner Agent for milestone formulation and critical path sequencing',
    icon: Network,
    route: '/project/smart-helmet/architecture',
    capabilities: [
      'Subsystem & component boundary definitions',
      'Interface protocol mapping (I2C, BLE 5.0, MQTT/JSON)',
      'Traceable end-to-end data flow sequence diagram',
    ],
    accentColor: 'var(--cyan)',
    sampleInput: 'Requirements matrix for sensor telemetry, BLE communication, and cloud broker',
    sampleArtifact: 'Component Graph, Interface Protocols & Bus Topologies',
    sampleOutputItems: [
      'Mapped 4 hardware & software subsystems with zero interface conflicts',
      'Defined I2C sensor bus topology and fallback fail-safe state',
      'Generated end-to-end data flow sequence diagram connecting sensors to telemetry broker',
    ],
  },
  {
    id: 'tasks',
    step: '03',
    title: 'Planner Agent',
    subtitle: 'Milestones & Tasks',
    stage: 'EXECUTION PLAN',
    description: 'Converts designs into milestones and actionable tasks.',
    receivesFrom: 'System component graph and interface boundaries from Architecture Agent',
    handoffTo: 'Reviewer Agent for risk scanning and gap identification',
    icon: ClipboardCheck,
    route: '/project/smart-helmet/tasks',
    capabilities: [
      'Milestone formulation across development phases',
      'Critical path analysis and dependency ordering',
      'Measurable task-level completion criteria',
    ],
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
    receivesFrom: 'Full project memory: requirements, system graph, and execution roadmap',
    handoffTo: 'Test Agent for verification scenario generation',
    icon: ShieldCheck,
    route: '/project/smart-helmet/risks',
    capabilities: [
      'Failure mode & design contradiction detection',
      'Automated severity rating (Critical, High, Medium)',
      'Mitigation synthesis and auto-task creation',
    ],
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
    receivesFrom: 'Component interfaces and safety state definitions from prior agents',
    handoffTo: 'Continuous integration telemetry and validation gates',
    icon: TestTube2,
    route: '/project/smart-helmet/testing',
    capabilities: [
      'Edge-case & boundary condition scenario tests',
      'Precondition matrix and pass/fail telemetry',
      'Automated traceability to functional requirement IDs',
    ],
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
  // Active agent for on-screen popup briefing on the same page
  const [briefingAgent, setBriefingAgent] = useState<AgentMeta | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)

  // Clicking any tile opens the screen popup briefing on the same page (NO page change)
  const handleOpenBriefing = (agent: AgentMeta) => {
    setBriefingAgent(agent)
    setIsSimulating(false)
    setSimulationProgress(0)
  }

  const handleCloseBriefing = () => {
    setBriefingAgent(null)
    setIsSimulating(false)
    setSimulationProgress(0)
  }

  // Navigation between agents inside the popup briefing
  const currentAgentIndex = briefingAgent
    ? AGENTS.findIndex(a => a.id === briefingAgent.id)
    : -1

  const prevAgent = currentAgentIndex > 0 ? AGENTS[currentAgentIndex - 1] : null
  const nextAgent =
    currentAgentIndex >= 0 && currentAgentIndex < AGENTS.length - 1
      ? AGENTS[currentAgentIndex + 1]
      : null

  const handlePrevAgent = () => {
    if (prevAgent) {
      setBriefingAgent(prevAgent)
      setIsSimulating(false)
      setSimulationProgress(0)
    }
  }

  const handleNextAgent = () => {
    if (nextAgent) {
      setBriefingAgent(nextAgent)
      setIsSimulating(false)
      setSimulationProgress(0)
    }
  }

  const runSimulation = () => {
    setIsSimulating(true)
    setSimulationProgress(25)
    setTimeout(() => setSimulationProgress(65), 500)
    setTimeout(() => setSimulationProgress(100), 1000)
    setTimeout(() => setIsSimulating(false), 1400)
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

      {/* Lifecycle Flow Pipeline Tracker - Arrows allocated correctly between stages */}
      <div className="agent-pipeline-flow-track" aria-label="Agent collaborative lifecycle workflow">
        <div className="pipeline-track-header">
          <span className="pipeline-track-label">
            <Sparkles size={13} style={{ color: 'var(--lime)' }} />
            COLLABORATIVE AGENT LIFECYCLE PIPELINE
          </span>
          <span className="pipeline-track-caption">
            Click any agent card or stage to view its on-screen briefing
          </span>
        </div>

        <div className="pipeline-flow-steps">
          {AGENTS.map((agent, index) => {
            const isLast = index === AGENTS.length - 1
            return (
              <React.Fragment key={agent.id}>
                <button
                  type="button"
                  className="pipeline-flow-chip"
                  onClick={() => handleOpenBriefing(agent)}
                  title={`View on-screen briefing for ${agent.title}`}
                >
                  <span className="step-num">{agent.step}</span>
                  <span className="step-name">{agent.stage}</span>
                </button>

                {/* Arrow connecting each agent stage to the next - NO arrow after the last agent */}
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

      {/* 5-Column Agent Grid - Clicking opens screen popup briefing on the same page */}
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
              onClick={() => handleOpenBriefing(agent)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleOpenBriefing(agent)
                }
              }}
              aria-label={`Open on-screen briefing for ${agent.title}`}
              title="Click to view on-screen agent briefing"
            >
              {/* Top row: Icon Box on left, Step & Briefing tag on right */}
              <div className="agent-tile-top">
                <span className="icon-box" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <div className="agent-tile-badges">
                  <span className="step-badge">{agent.step}</span>
                  <span className="briefing-pill-tag">Briefing</span>
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
                <span className="agent-cta-text">View Briefing</span>
                <span className="agent-cta-arrow">
                  <ArrowRight size={14} className="agent-arrow-svg" />
                </span>
              </div>

              {/* Inter-card Pipeline Flow Arrow on right border (only between cards, not on last) */}
              {!isLast && (
                <div className="inter-card-arrow" aria-hidden="true" title="Hands off to next stage">
                  <ChevronRight size={13} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* SCREEN POPUP BRIEFING MODAL (ON THE SAME PAGE - NO PAGE REDIRECT)          */}
      {/* ========================================================================= */}
      {briefingAgent && (
        <div
          className="modal-backdrop"
          onClick={handleCloseBriefing}
          role="presentation"
        >
          <div
            className="modal-window agent-briefing-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="briefing-title"
          >
            {/* Modal Header */}
            <div className="modal-header briefing-modal-head">
              <div className="modal-header-text">
                <span className="eyebrow">
                  <Zap size={13} style={{ color: 'var(--lime)' }} />
                  STAGE {briefingAgent.step} / {briefingAgent.stage} · AGENT BRIEFING
                </span>
                <h2 id="briefing-title">{briefingAgent.title}</h2>
                <p className="briefing-subtitle">
                  {briefingAgent.description}
                </p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={handleCloseBriefing}
                aria-label="Close briefing popup"
                title="Close briefing"
              >
                <X size={18} />
              </button>
            </div>

            {/* In-Modal Step Switcher with sequence arrows */}
            <div className="modal-stage-switcher" aria-label="Browse other agent briefings">
              {AGENTS.map((agent, i) => {
                const isActive = agent.id === briefingAgent.id
                const isFinal = i === AGENTS.length - 1
                return (
                  <React.Fragment key={agent.id}>
                    <button
                      type="button"
                      className={`modal-stage-chip ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setBriefingAgent(agent)
                        setIsSimulating(false)
                        setSimulationProgress(0)
                      }}
                      title={`Switch briefing to ${agent.title}`}
                    >
                      <span className="chip-step">{agent.step}</span>
                      <span className="chip-label">{agent.stage.split(' ')[0]}</span>
                    </button>
                    {!isFinal && <ChevronRight size={12} className="modal-stage-arrow" />}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Modal Body: Two-column layout that avoids vertical scrolling */}
            <div className="briefing-modal-body">
              <div className="briefing-content-grid">
                {/* Left Column: AI Reasoning Engine, Handoff, Responsibilities */}
                <div className="briefing-col-left">
                  <div className="briefing-meta-stack">
                    <div className="agent-engine-pill">
                      <BrainCircuit size={15} style={{ color: 'var(--lime)', flexShrink: 0 }} />
                      <div>
                        <small className="pill-eyebrow">AI REASONING ENGINE</small>
                        <span><b>NVIDIA Nemotron</b> via Nebius Token Factory</span>
                      </div>
                    </div>

                    <div className="handoff-pill">
                      <span className="handoff-tag">
                        <ArrowRight size={11} style={{ color: 'var(--cyan)' }} /> HANDS OFF TO:
                      </span>
                      <span className="handoff-text">{briefingAgent.handoffTo}</span>
                    </div>
                  </div>

                  <div>
                    <span className="caps-header-label">
                      Agent Responsibilities & Capabilities
                    </span>
                    <div className="modal-caps-grid">
                      {briefingAgent.capabilities.map(cap => (
                        <div className="modal-cap-item" key={cap}>
                          <Check size={12} style={{ color: 'var(--lime)', flexShrink: 0 }} />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Generated Engineering Artifact & Live Simulation */}
                <div className="briefing-col-right">
                  <div className="agent-sample-box briefing-artifact-box">
                    <div className="sample-box-header">
                      <span>
                        <Cpu size={13} /> GENERATED ENGINEERING ARTIFACT
                      </span>
                      <span className="badge badge-lime">VAULT SECURED</span>
                    </div>
                    <strong className="sample-artifact-title">{briefingAgent.sampleArtifact}</strong>
                    <ul className="sample-findings-list">
                      {briefingAgent.sampleOutputItems.map(item => (
                        <li key={item}>
                          <ChevronRight size={12} style={{ color: 'var(--lime)', flexShrink: 0, marginTop: '2px' }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Interactive Simulation Progress Bar */}
                  {isSimulating && (
                    <div className="simulation-progress-wrap" style={{ marginTop: '4px' }}>
                      <div className="sim-status-row">
                        <span>
                          <RefreshCw size={12} className="spin-icon" /> Simulating {briefingAgent.title} reasoning loop...
                        </span>
                        <span>{simulationProgress}%</span>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${simulationProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Navigation Arrows & Actions */}
              <div className="briefing-footer-actions">
                {/* Left/Right Navigation Arrows between agents */}
                <div className="briefing-nav-group">
                  <button
                    type="button"
                    className="btn btn-secondary nav-arrow-btn"
                    onClick={handlePrevAgent}
                    disabled={!prevAgent}
                    title={prevAgent ? `Briefing: ${prevAgent.title}` : 'First stage'}
                  >
                    <ArrowLeft size={13} />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary nav-arrow-btn"
                    onClick={handleNextAgent}
                    disabled={!nextAgent}
                    title={nextAgent ? `Briefing: ${nextAgent.title}` : 'Last stage'}
                  >
                    <span>Next</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Primary Actions: Test Reasoning & Optional Workspace Jump */}
                <div className="briefing-cta-group">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={runSimulation}
                    disabled={isSimulating}
                  >
                    <Play size={13} />
                    {isSimulating ? 'Reasoning...' : 'Test Reasoning'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseBriefing}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const route = briefingAgent.route
                      handleCloseBriefing()
                      navigate(route)
                    }}
                    title="Enter full project workspace for this agent"
                  >
                    <span>Open in Workspace</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
