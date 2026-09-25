import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  Check,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  TestTube2,
} from 'lucide-react'
import type { Project } from '../types'
import { TaskExecutionModal } from './TaskExecutionModal'
import './OverviewView.css'

interface OverviewViewProps {
  project: Project
  refresh: () => void
}

export function OverviewView({ project, refresh }: OverviewViewProps) {
  const navigate = useNavigate()
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  // Calculations
  const completedTasks = project.tasks.filter(t => t.status === 'Completed').length
  const totalTasks = project.tasks.length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.completion || 0

  const validatedReqs = project.requirements.filter(r => r.status === 'Validated').length
  const totalReqs = project.requirements.length
  const reqValidationRate = totalReqs > 0 ? Math.round((validatedReqs / totalReqs) * 100) : 0

  const openRisks = project.risks.filter(r => !r.resolved)
  const criticalRisks = openRisks.filter(r => r.severity === 'Critical')
  const highRisks = openRisks.filter(r => r.severity === 'High')

  const passedTests = project.tests.filter(t => t.status === 'Passed').length
  const totalTests = project.tests.length
  const testPassRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

  // Next recommended task
  const matchedTask = project.tasks.find(
    t =>
      t.id === 'T-04' ||
      t.title.toLowerCase().includes('fallback') ||
      t.title.toLowerCase() === project.nextAction.title.toLowerCase()
  )
  const isNextTaskInProgress = matchedTask?.status === 'In Progress'
  const isNextTaskCompleted = matchedTask?.status === 'Completed'

  return (
    <div className="overview-view">
      {/* 1. Header & Quick Actions */}
      <div className="page-header">
        <div className="header-left">
          <div className="eyebrow-badge">
            <BrainCircuit size={12} />
            WORKSPACE INTELLIGENCE & MISSION CONTROL
          </div>
          <h1>{project.name}</h1>
          <div className="header-meta-row">
            <span className="project-type-pill">{project.type}</span>
            <span className="project-stage-pill">{project.stage}</span>
            {project.id === 'smart-helmet' && (
              <span className="eyebrow-badge" style={{ color: 'var(--lime)', borderColor: 'rgba(167, 255, 82, 0.3)' }}>
                DEMO WORKSPACE
              </span>
            )}
          </div>
        </div>

        <div className="header-right-actions">
          <button
            type="button"
            className="btn-primary-plan"
            onClick={() => navigate(`/project/${project.id}/tasks`)}
          >
            <ClipboardCheck size={16} />
            Execution Plan
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Ribbon */}
      <div className="overview-kpi-ribbon">
        {/* Project Velocity */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-wrap">
              <ClipboardCheck size={18} />
            </div>
            <span className="kpi-badge badge-live">
              <span className="pulse-dot" />
              IN PROGRESS
            </span>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{completionPercentage}%</span>
            <span className="kpi-label">Project Completion</span>
            <span className="kpi-subtext">
              {completedTasks} of {totalTasks} milestones completed
            </span>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-wrap cyan">
              <FileText size={18} />
            </div>
            <span className="kpi-badge badge-cyan">{reqValidationRate}% VALIDATED</span>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalReqs}</span>
            <span className="kpi-label">Requirements Defined</span>
            <span className="kpi-subtext">
              {validatedReqs} verified · {totalReqs - validatedReqs} pending review
            </span>
          </div>
        </div>

        {/* Risk & Safety Radar */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className={`kpi-icon-wrap ${criticalRisks.length > 0 ? 'red' : 'amber'}`}>
              <CircleAlert size={18} />
            </div>
            {criticalRisks.length > 0 ? (
              <span className="kpi-badge badge-warning">
                <span className="red-pulse-dot" />
                {criticalRisks.length} CRITICAL
              </span>
            ) : (
              <span className="kpi-badge" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
                CONTROLLED
              </span>
            )}
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{openRisks.length}</span>
            <span className="kpi-label">Identified Risks & Gaps</span>
            <span className="kpi-subtext">
              {highRisks.length} high priority · {project.risks.filter(r => r.resolved).length} resolved
            </span>
          </div>
        </div>

        {/* Test Coverage */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-wrap" style={{ color: '#34d399', background: 'rgba(52, 211, 153, 0.08)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>
              <TestTube2 size={18} />
            </div>
            <span className="kpi-badge" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
              {testPassRate}% PASS RATE
            </span>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalTests}</span>
            <span className="kpi-label">QA Test Scenarios</span>
            <span className="kpi-subtext">
              {passedTests} passed · {totalTests - passedTests} pending execution
            </span>
          </div>
        </div>
      </div>

      {/* 3. Hero Card: Next Recommended Action */}
      <div className="hero-action-card">
        <div className="hero-card-header">
          <div className="hero-tag-group">
            <span className="eyebrow-badge">
              <Sparkles size={12} />
              NEXT RECOMMENDED ACTION
            </span>
            <span
              className={`hero-priority-badge ${
                project.nextAction.priority.toLowerCase() === 'critical' ? 'critical' : 'high'
              }`}
            >
              {project.nextAction.priority} PRIORITY
            </span>
          </div>

          <span className="hero-status-tag">
            {isNextTaskCompleted
              ? '✓ COMPLETED'
              : isNextTaskInProgress
              ? '● IN PROGRESS'
              : 'READY TO START'}
          </span>
        </div>

        <div className="hero-title-section">
          <h2>{project.nextAction.title}</h2>
          <p>{project.nextAction.description}</p>
        </div>

        <div className="criteria-grid">
          {project.nextAction.criteria.map(item => (
            <div className="criteria-item" key={item}>
              <Check size={14} />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="hero-footer-bar">
          <div className="effort-indicator">
            <span>ESTIMATED EFFORT:</span>
            <b style={{ color: 'var(--text)' }}>{project.nextAction.effort}</b>
          </div>

          <button
            type="button"
            className="btn-launch-task"
            onClick={() => setTaskModalOpen(true)}
          >
            {isNextTaskCompleted ? (
              <>
                <Check size={15} />
                Task Completed · View Briefing
              </>
            ) : isNextTaskInProgress ? (
              <>
                <Play size={15} />
                Continue Task Execution
              </>
            ) : (
              <>
                <Play size={15} />
                Launch Task Execution
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Core Workspace Modules (6 Cards) */}
      <div className="modules-section-title">
        <h2>Workspace Engineering Modules</h2>
        <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          DIRECT NAVIGATION & VITAL TELEMETRY
        </span>
      </div>

      <div className="modules-grid">
        {/* Requirements */}
        <Link to={`/project/${project.id}/requirements`} className="module-nav-card">
          <div className="module-card-top">
            <div className="module-icon-box">
              <FileText size={18} />
            </div>
            <ArrowRight size={16} className="module-arrow-icon" />
          </div>
          <div className="module-card-content">
            <span className="module-title">Requirements</span>
            <span className="module-primary-stat">{project.requirements.length} Specifications</span>
            <span className="module-subtext">
              {project.requirements.filter(r => r.status === 'Validated').length} validated ·{' '}
              {project.requirements.filter(r => r.status === 'Needs review').length} need review
            </span>
          </div>
        </Link>

        {/* Architecture */}
        <Link to={`/project/${project.id}/architecture`} className="module-nav-card">
          <div className="module-card-top">
            <div className="module-icon-box" style={{ color: 'var(--lime)' }}>
              <Network size={18} />
            </div>
            <ArrowRight size={16} className="module-arrow-icon" />
          </div>
          <div className="module-card-content">
            <span className="module-title">Architecture</span>
            <span className="module-primary-stat">{project.architecture.length} Components</span>
            <span className="module-subtext">
              System topology, interfaces, and boundary contracts mapped
            </span>
          </div>
        </Link>

        {/* Execution Plan */}
        <Link to={`/project/${project.id}/tasks`} className="module-nav-card">
          <div className="module-card-top">
            <div className="module-icon-box" style={{ color: 'var(--cyan)' }}>
              <ClipboardCheck size={18} />
            </div>
            <ArrowRight size={16} className="module-arrow-icon" />
          </div>
          <div className="module-card-content">
            <span className="module-title">Execution Plan</span>
            <span className="module-primary-stat">
              {completedTasks} / {totalTasks} Completed
            </span>
            <span className="module-subtext">
              {project.tasks.filter(t => t.status === 'In Progress').length} tasks currently active
            </span>
          </div>
        </Link>

        {/* Risks & Gaps */}
        <Link to={`/project/${project.id}/risks`} className="module-nav-card">
          <div className="module-card-top">
            <div className="module-icon-box" style={{ color: openRisks.length > 0 ? 'var(--amber)' : '#34d399' }}>
              <CircleAlert size={18} />
            </div>
            <ArrowRight size={16} className="module-arrow-icon" />
          </div>
          <div className="module-card-content">
            <span className="module-title">Risks & Gaps</span>
            <span className="module-primary-stat" style={{ color: criticalRisks.length > 0 ? 'var(--red)' : 'var(--amber)' }}>
              {openRisks.length} Active Risks
            </span>
            <span className="module-subtext">
              {criticalRisks.length} critical · Recommended mitigations available
            </span>
          </div>
        </Link>

        {/* Testing */}
        <Link to={`/project/${project.id}/testing`} className="module-nav-card">
          <div className="module-card-top">
            <div className="module-icon-box" style={{ color: '#34d399' }}>
              <TestTube2 size={18} />
            </div>
            <ArrowRight size={16} className="module-arrow-icon" />
          </div>
          <div className="module-card-content">
            <span className="module-title">Testing & Verification</span>
            <span className="module-primary-stat">{testPassRate}% Pass Rate</span>
            <span className="module-subtext">
              {passedTests} passed · {totalTests - passedTests} pending verification
            </span>
          </div>
        </Link>
      </div>

      {/* 5. Autonomous AI Agents & Intelligence Findings Split Grid */}
      <div className="intelligence-split-grid">
        {/* Left: AI Team */}
        <div className="panel-card">
          <div className="panel-head-row">
            <h3>Autonomous AI Engineering Team</h3>
            <Link to={`/project/${project.id}/activity`}>
              Agent Activity <ArrowRight size={13} />
            </Link>
          </div>

          <div className="agent-team-list">
            {[
              { name: 'Requirement Agent', role: 'Functional PRD extraction & scope parsing', status: 'Ready', icon: FileText },
              { name: 'Architecture Agent', role: 'Topology design & interface mapping', status: 'Active', icon: Network },
              { name: 'Planner Agent', role: 'WBS milestones & engineering decomposition', status: 'Ready', icon: ClipboardCheck },
              { name: 'Reviewer Agent', role: 'Security radar & failure-mode detection', status: openRisks.length > 0 ? 'Alert' : 'Ready', icon: ShieldCheck },
              { name: 'Test Agent', role: 'Scenario synthesis & edge-case test runs', status: 'Ready', icon: TestTube2 },
            ].map(agent => {
              const Icon = agent.icon
              return (
                <div className="agent-team-item" key={agent.name}>
                  <div className="agent-info-left">
                    <div className="agent-mini-avatar">
                      <Icon size={15} />
                    </div>
                    <div className="agent-name-role">
                      <span className="agent-title-text">{agent.name}</span>
                      <span className="agent-role-text">{agent.role}</span>
                    </div>
                  </div>
                  <span className={`agent-status-pill ${agent.status.toLowerCase()}`}>
                    {agent.status === 'Active' ? 'OPERATIONAL' : agent.status === 'Alert' ? 'ATTENTION' : 'IDLE / READY'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Recent Agent Findings */}
        <div className="panel-card">
          <div className="panel-head-row">
            <h3>Recent Intelligence Findings</h3>
            <Link to={`/project/${project.id}/risks`}>
              View All Risks <ArrowRight size={13} />
            </Link>
          </div>

          <div className="findings-stream">
            {project.risks.slice(0, 4).map(risk => (
              <Link
                className="finding-card-item"
                to={`/project/${project.id}/risks`}
                key={risk.id}
              >
                <span
                  className="hero-priority-badge"
                  style={{
                    background: risk.severity === 'Critical' ? 'rgba(255, 82, 82, 0.12)' : 'rgba(255, 179, 0, 0.12)',
                    color: risk.severity === 'Critical' ? 'var(--red)' : 'var(--amber)',
                    border: `1px solid ${risk.severity === 'Critical' ? 'rgba(255, 82, 82, 0.3)' : 'rgba(255, 179, 0, 0.3)'}`,
                  }}
                >
                  {risk.severity}
                </span>
                <div className="finding-text-group">
                  <span className="finding-headline">{risk.title}</span>
                  <span className="finding-meta-line">
                    {risk.severity === 'Critical' ? 'Critical Radar' : 'System Radar'} · {risk.resolved ? 'Resolved' : 'Requires Mitigation'}
                  </span>
                </div>
                <ArrowRight size={15} style={{ color: '#526e67' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Task Execution Modal */}
      <TaskExecutionModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        project={project}
        refresh={refresh}
      />
    </div>
  )
}
