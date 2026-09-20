import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Cpu,
  FolderGit2,
  Layers,
  Plus,
  X,
} from 'lucide-react'
import type { Project } from '../types'
import { projectService } from '../services/projectService'
import './ProjectDetailsModal.css'

interface ProjectDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
}

export function ProjectDetailsModal({
  isOpen,
  onClose,
  project,
}: ProjectDetailsModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const allProjects = projectService.getProjects()
  const completedTasks = project.tasks.filter(t => t.status === 'Completed').length
  const totalTasks = project.tasks.length
  const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.completion || 0
  const openRisks = project.risks.filter(r => !r.resolved)

  const handleSwitchProject = (id: string) => {
    onClose()
    navigate(`/project/${id}`)
  }

  return (
    <div className="project-modal-backdrop" onClick={onClose}>
      <div className="project-modal-window" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="project-modal-header">
          <div className="project-modal-header-left">
            <span className="eyebrow-badge" style={{ color: 'var(--cyan)', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
              <BrainCircuit size={12} />
              CURRENT WORKSPACE SPECIFICATION
            </span>
            <h2>{project.name}</h2>
            <div className="project-modal-badges">
              <span className="tech-chip" style={{ color: 'var(--cyan)', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
                {project.type}
              </span>
              <span className="tech-chip">{project.stage}</span>
              {project.id === 'smart-helmet' && (
                <span className="tech-chip" style={{ color: 'var(--lime)', borderColor: 'rgba(167, 255, 82, 0.3)' }}>
                  DEMO WORKSPACE
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="project-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="project-modal-body">
          {/* Quick Metrics */}
          <div className="project-vitals-grid">
            <div className="project-vital-box">
              <span className="project-vital-label">Completion Velocity</span>
              <span className="project-vital-val" style={{ color: 'var(--lime)' }}>{completion}%</span>
              <span className="project-vital-sub">{completedTasks} / {totalTasks} milestones done</span>
            </div>

            <div className="project-vital-box">
              <span className="project-vital-label">Active Components</span>
              <span className="project-vital-val" style={{ color: 'var(--cyan)' }}>
                {project.architecture.length}
              </span>
              <span className="project-vital-sub">System topology mapped</span>
            </div>

            <div className="project-vital-box">
              <span className="project-vital-label">Risk Exposure</span>
              <span className="project-vital-val" style={{ color: openRisks.length > 0 ? 'var(--amber)' : '#34d399' }}>
                {openRisks.length}
              </span>
              <span className="project-vital-sub">
                {openRisks.filter(r => r.severity === 'Critical').length} critical issues
              </span>
            </div>
          </div>

          {/* Project Objective */}
          <div>
            <div className="project-modal-section-title">
              <Layers size={13} />
              Project Objective & Problem Definition
            </div>
            <div className="project-desc-box">
              {project.objective || project.idea || 'Autonomous engineering project initialized via ProjectPilot AI.'}
            </div>
          </div>

          {/* Technology Stack */}
          {project.technologies && project.technologies.length > 0 && (
            <div>
              <div className="project-modal-section-title">
                <Cpu size={13} />
                Hardware & Software Stack
              </div>
              <div className="tech-chips-wrap">
                {project.technologies.map(tech => (
                  <span className="tech-chip" key={tech}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Switch Active Projects */}
          <div>
            <div className="project-modal-section-title">
              <FolderGit2 size={13} />
              Available Workspaces ({allProjects.length})
            </div>
            <div className="projects-switcher-list">
              {allProjects.map(p => {
                const isActive = p.id === project.id
                return (
                  <div
                    className={`project-switcher-item ${isActive ? 'is-active' : ''}`}
                    key={p.id}
                  >
                    <div className="project-switcher-item-left">
                      <span className="project-switcher-title">{p.name}</span>
                      <span className="project-switcher-type">
                        {p.type} · {p.stage}
                      </span>
                    </div>

                    {isActive ? (
                      <span
                        className="tech-chip"
                        style={{
                          background: 'rgba(167, 255, 82, 0.1)',
                          color: 'var(--lime)',
                          border: '1px solid rgba(167, 255, 82, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={12} /> ACTIVE
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-switch-project"
                        onClick={() => handleSwitchProject(p.id)}
                      >
                        Switch Workspace <ArrowRight size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="project-modal-footer">
          <button
            type="button"
            className="btn-new-project-link"
            onClick={() => {
              onClose()
              navigate('/new-project')
            }}
          >
            <Plus size={14} /> Create New Project
          </button>

          <button
            type="button"
            className="btn-audit"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
