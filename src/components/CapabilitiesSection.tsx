import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Cpu,
  Layers,
  Network,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Zap,
} from 'lucide-react'
import './CapabilitiesSection.css'

interface CapabilityCard {
  id: string
  badge: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  keyFeatures: string[]
  metric: { value: string; label: string }
  targetRoute: string
}

const CAPABILITIES: CapabilityCard[] = [
  {
    id: 'prd-synthesis',
    badge: 'SPECIFICATION SYNTHESIS',
    title: 'Automated Requirements & PRD Engineering',
    subtitle: 'From informal thoughts to verifiable functional criteria',
    description:
      'Transforms unstructured problem descriptions into complete functional (FR) and non-functional (NFR) engineering specifications with requirement boundary contracts.',
    icon: Sparkles,
    color: 'var(--lime)',
    keyFeatures: [
      'Deconstructs ambiguities into measurable engineering constraints',
      'Assigns testability criteria and priority levels',
      'Tracks validation status and dependencies across milestones',
    ],
    metric: { value: '100%', label: 'Traceability' },
    targetRoute: '/project/smart-helmet/requirements',
  },
  {
    id: 'architecture-modeling',
    badge: 'TOPOLOGY & ARCHITECTURE',
    title: 'Multi-Tier System Topology Modeling',
    subtitle: 'Component decomposition & interface boundary protocols',
    description:
      'Designs end-to-end hardware and software components, communications buses (I2C, SPI, BLE, MQTT), and cloud boundary mappings tailored to your constraints.',
    icon: Network,
    color: 'var(--cyan)',
    keyFeatures: [
      'Automatic component role & responsibility definition',
      'Bus interface and payload protocol contracts',
      'Dataflow dependency graphs with hardware-software split',
    ],
    metric: { value: '6+', label: 'Subsystems Mapped' },
    targetRoute: '/project/smart-helmet/architecture',
  },
  {
    id: 'execution-decomposition',
    badge: 'ENGINEERING WORK BREAKDOWN',
    title: 'Phased Implementation & Critical Path Roadmaps',
    subtitle: 'Actionable engineering tasks with effort estimates',
    description:
      'Decomposes high-level architecture into sequenced execution phases with measurable DoD (Definition of Done), dependencies, and estimated effort times.',
    icon: Layers,
    color: '#a78bfa',
    keyFeatures: [
      'Actionable task cards with step-by-step acceptance criteria',
      'Blocked task prevention via dependency chaining',
      'Interactive execution briefing with agent handoff logs',
    ],
    metric: { value: 'Phase 1–4', label: 'Milestone Delivery' },
    targetRoute: '/project/smart-helmet/tasks',
  },
  {
    id: 'risk-radar',
    badge: 'AUTOMATED SAFETY RADAR',
    title: 'Engineering Risk & Vulnerability Detection',
    subtitle: 'Real-time failure mode analysis and mitigation playbooks',
    description:
      'Continuously scrutinizes power budgets, interface mismatches, thermal boundaries, and edge-case failure modes before committing to fabrication or deployment.',
    icon: ShieldCheck,
    color: 'var(--amber)',
    keyFeatures: [
      'Automated severity ranking (Critical, High, Medium)',
      'Actionable mitigation strategies with hardware fallbacks',
      'Impact blast radius estimation on dependent tasks',
    ],
    metric: { value: '0 Critical', label: 'Unmitigated Risks' },
    targetRoute: '/project/smart-helmet/risks',
  },
  {
    id: 'verification-matrix',
    badge: 'VERIFICATION & TESTING',
    title: 'Automated Verification & Validation Matrix',
    subtitle: 'Precondition setups, execution steps, and pass/fail criteria',
    description:
      'Generates automated test suites covering unit boundary tests, hardware-in-the-loop (HIL) simulations, environmental extremes, and latency SLAs.',
    icon: TestTube2,
    color: '#34d399',
    keyFeatures: [
      'Precondition definitions and sensor stimulus setups',
      'Pass/fail thresholds with reproducible verification telemetry',
      'Regression audit trails linked to project requirements',
    ],
    metric: { value: '94%', label: 'Test Pass Rate' },
    targetRoute: '/project/smart-helmet/testing',
  },
  {
    id: 'agentic-copilot',
    badge: 'NVIDIA NEMOTRON ORCHESTRATION',
    title: 'Autonomous Multi-Agent Orchestration',
    subtitle: 'Collaborative reasoning agents running in concert',
    description:
      'Specialized reasoning agents communicate via structured memory handoffs, autonomously reviewing artifacts, solving gaps, and suggesting the next engineering action.',
    icon: Cpu,
    color: 'var(--lime)',
    keyFeatures: [
      'Deterministic memory handoffs between specialized agents',
      'Zero-latency reasoning powered by Nebius Token Factory',
      'Interactive next-action engine keeping teams unblocked',
    ],
    metric: { value: '<500ms', label: 'Inference Velocity' },
    targetRoute: '/project/smart-helmet/activity',
  },
]

export function CapabilitiesSection() {
  const navigate = useNavigate()

  return (
    <section className="section capabilities-section" id="capabilities">
      <div className="section-intro">
        <h2>Enterprise-grade capabilities for complex systems.</h2>
        <p>
          Everything required to turn ambitious hardware, IoT, and software concepts into
          rigorously planned, tested, and validated engineering blueprints.
        </p>
      </div>

      <div className="capabilities-grid">
        {CAPABILITIES.map(cap => {
          const Icon = cap.icon
          return (
            <div
              className="capability-card panel"
              key={cap.id}
              onClick={() => navigate(cap.targetRoute)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(cap.targetRoute)
                }
              }}
            >
              <div className="capability-card-header">
                <div className="capability-icon-wrap" style={{ color: cap.color, borderColor: `color-mix(in srgb, ${cap.color} 30%, transparent)` }}>
                  <Icon size={20} />
                </div>
                <div className="capability-metric-chip">
                  <span className="metric-val" style={{ color: cap.color }}>{cap.metric.value}</span>
                  <span className="metric-lbl">{cap.metric.label}</span>
                </div>
              </div>

              <div className="capability-badge-row">
                <span className="capability-tag">{cap.badge}</span>
              </div>

              <h3 className="capability-title">{cap.title}</h3>
              <p className="capability-desc">{cap.description}</p>

              <div className="capability-features-list">
                {cap.keyFeatures.map((feat, i) => (
                  <div className="capability-feature-item" key={i}>
                    <CheckCircle2 size={13} style={{ color: cap.color, flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="capability-card-footer">
                <span className="capability-explore-link">
                  <span>Explore in Workspace</span>
                  <Zap size={12} />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
