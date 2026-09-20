import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Key,
  LayoutDashboard,
  Network,
  Plus,
  Search,
  Settings,
  Sparkles,
  TestTube2,
  UserRound,
  X,
} from 'lucide-react'
import type { Project } from '../types'

export interface WorkspaceSearchModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
}

type SearchCategory = 'all' | 'pages' | 'requirements' | 'architecture' | 'tasks' | 'risks' | 'tests' | 'actions'

interface SearchItem {
  id: string
  title: string
  subtitle: string
  category: SearchCategory
  categoryLabel: string
  route: string
  badge?: string
  badgeTone?: 'lime' | 'amber' | 'red' | 'cyan' | 'default'
  icon: React.ComponentType<{ size?: number; className?: string }>
}

export function WorkspaceSearchModal({ isOpen, onClose, project }: WorkspaceSearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<SearchCategory>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Build searchable index from current project state
  const searchIndex = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [
      // Primary Workspace Pages
      {
        id: 'page-overview',
        title: 'Project Overview Dashboard',
        subtitle: `${project.name} · Completion: ${project.completion}% · ${project.stage}`,
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}`,
        badge: 'PAGE',
        badgeTone: 'lime',
        icon: LayoutDashboard,
      },
      {
        id: 'page-requirements',
        title: 'Requirements Engineering',
        subtitle: `${project.requirements.length} requirements defined and validated`,
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}/requirements`,
        badge: 'PAGE',
        badgeTone: 'lime',
        icon: FileText,
      },
      {
        id: 'page-architecture',
        title: 'System Architecture & Data Flow',
        subtitle: `${project.architecture.length} subsystems & components mapped`,
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}/architecture`,
        badge: 'PAGE',
        badgeTone: 'lime',
        icon: Network,
      },
      {
        id: 'page-tasks',
        title: 'Execution Plan & Milestones',
        subtitle: `${project.tasks.filter(t => t.status === 'Completed').length} / ${project.tasks.length} tasks completed`,
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}/tasks`,
        badge: 'PAGE',
        badgeTone: 'lime',
        icon: ClipboardCheck,
      },
      {
        id: 'page-risks',
        title: 'Engineering Review & Risks',
        subtitle: `${project.risks.filter(r => !r.resolved).length} unresolved risks detected`,
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}/risks`,
        badge: 'PAGE',
        badgeTone: 'lime',
        icon: CircleAlert,
      },
      {
        id: 'page-testing',
        title: 'Verification & Testing Matrix',
        subtitle: `${project.tests.length} automated test scenarios formulated`,
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}/testing`,
        badge: 'PAGE',
        badgeTone: 'lime',
        icon: TestTube2,
      },
      {
        id: 'page-activity',
        title: 'Agent Activity Memory & Runs',
        subtitle: `${project.activity.length + 13} total agentic reasoning traces logged`,
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}/activity`,
        badge: 'PAGE',
        badgeTone: 'cyan',
        icon: Activity,
      },
      {
        id: 'page-api-keys',
        title: 'API Keys & Engine Vault',
        subtitle: 'Manage NVIDIA Nemotron credentials & Nebius Token Factory access',
        category: 'pages',
        categoryLabel: 'Workspace Page',
        route: `/project/${project.id}/api-keys`,
        badge: 'SECURITY',
        badgeTone: 'lime',
        icon: Key,
      },


      {
        id: 'action-analyze-req',
        title: 'Analyze & Structure Requirements',
        subtitle: 'Let Requirement Agent transform raw ideas into specifications',
        category: 'actions',
        categoryLabel: 'Quick Action',
        route: `/project/${project.id}/requirements`,
        badge: 'AGENT ACTION',
        badgeTone: 'lime',
        icon: Sparkles,
      },
      {
        id: 'action-new-project',
        title: 'Create New Project Workspace',
        subtitle: 'Configure a new IoT, web, or AI system workspace',
        category: 'actions',
        categoryLabel: 'Quick Action',
        route: '/new-project',
        badge: 'WORKSPACE',
        badgeTone: 'default',
        icon: Plus,
      },
      {
        id: 'action-profile',
        title: 'User Profile & Account Info',
        subtitle: 'Edit avatar, name, email, and engineering role',
        category: 'actions',
        categoryLabel: 'Account',
        route: '/profile',
        badge: 'SETTINGS',
        badgeTone: 'default',
        icon: UserRound,
      },
      {
        id: 'action-settings',
        title: 'Workspace Theme & Notifications',
        subtitle: 'Switch theme between Cyber Dark, Slate, and Midnight',
        category: 'actions',
        categoryLabel: 'Settings',
        route: '/settings',
        badge: 'THEME',
        badgeTone: 'cyan',
        icon: Settings,
      },
    ]

    // Requirements indexing
    project.requirements.forEach(req => {
      items.push({
        id: `req-${req.id}`,
        title: req.text,
        subtitle: `${req.id} · ${req.kind} · Priority: ${req.priority} · Status: ${req.status}`,
        category: 'requirements',
        categoryLabel: 'Requirement',
        route: `/project/${project.id}/requirements`,
        badge: req.id,
        badgeTone: req.priority === 'High' ? 'amber' : req.priority === 'Critical' ? 'red' : 'lime',
        icon: FileText,
      })
    })

    // Architecture indexing
    project.architecture.forEach(arch => {
      items.push({
        id: `arch-${arch.id}`,
        title: arch.name,
        subtitle: `${arch.type || 'Subsystem'} · ${arch.responsibility}`,
        category: 'architecture',
        categoryLabel: 'Architecture',
        route: `/project/${project.id}/architecture`,
        badge: arch.technology || 'Component',
        badgeTone: 'cyan',
        icon: Network,
      })
    })

    // Tasks indexing
    project.tasks.forEach(task => {
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: `${task.milestone} · ${task.id} · Criteria: ${task.successCriteria}`,
        category: 'tasks',
        categoryLabel: 'Execution Task',
        route: `/project/${project.id}/tasks`,
        badge: task.status,
        badgeTone: task.status === 'Completed' ? 'lime' : 'amber',
        icon: ClipboardCheck,
      })
    })

    // Risks indexing
    project.risks.forEach(risk => {
      items.push({
        id: `risk-${risk.id}`,
        title: risk.title,
        subtitle: `${risk.severity} severity · ${risk.detail}`,
        category: 'risks',
        categoryLabel: 'Engineering Risk',
        route: `/project/${project.id}/risks`,
        badge: risk.severity.toUpperCase(),
        badgeTone: risk.severity === 'Critical' ? 'red' : risk.severity === 'High' ? 'amber' : 'default',
        icon: CircleAlert,
      })
    })

    // Tests indexing
    project.tests.forEach(test => {
      items.push({
        id: `test-${test.id}`,
        title: test.scenario,
        subtitle: `${test.id} · Precondition: ${test.precondition} · Expected: ${test.expected}`,
        category: 'tests',
        categoryLabel: 'Verification Test',
        route: `/project/${project.id}/testing`,
        badge: test.status.toUpperCase(),
        badgeTone: test.status === 'Passed' ? 'lime' : test.status === 'Failed' ? 'red' : 'default',
        icon: TestTube2,
      })
    })

    return items
  }, [project])

  // Filter items according to search query and category
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return searchIndex.filter(item => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      if (!matchesCategory) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q)) ||
        item.categoryLabel.toLowerCase().includes(q)
      )
    })
  }, [searchIndex, query, categoryFilter])

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector<HTMLElement>('.workspace-search-item.active')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (filteredItems.length ? (prev + 1) % filteredItems.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleSelectItem = (item: SearchItem) => {
    onClose()
    navigate(item.route)
  }

  if (!isOpen) return null

  const categories: { id: SearchCategory; label: string }[] = [
    { id: 'all', label: 'All Items' },
    { id: 'pages', label: 'Pages' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'risks', label: 'Risks' },
    { id: 'tests', label: 'Tests' },
    { id: 'actions', label: 'Actions' },
  ]

  return (
    <div
      className="modal-backdrop workspace-search-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="workspace-search-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace Search Palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="workspace-search-header">
          <div className="workspace-search-input-wrap">
            <Search size={18} className="search-input-icon" />
            <input
              ref={inputRef}
              type="text"
              className="workspace-search-input"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Search requirements, architecture, tasks, risks, testing..."
              aria-label="Search workspace query"
            />
            {query && (
              <button
                type="button"
                className="workspace-search-clear"
                onClick={() => {
                  setQuery('')
                  setSelectedIndex(0)
                  inputRef.current?.focus()
                }}
                title="Clear search query"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Close search"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Chips Bar */}
        <div className="workspace-search-filters">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`workspace-search-filter-chip ${categoryFilter === cat.id ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(cat.id)
                setSelectedIndex(0)
              }}
            >
              {cat.label}
            </button>
          ))}
          <span className="search-results-count">
            {filteredItems.length} {filteredItems.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {/* Search Results List */}
        <div className="workspace-search-body" ref={resultsContainerRef}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const Icon = item.icon
              const isSelected = index === selectedIndex
              return (
                <div
                  key={item.id}
                  className={`workspace-search-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="workspace-search-item-icon">
                    <Icon size={16} />
                  </div>
                  <div className="workspace-search-item-info">
                    <div className="workspace-search-item-top">
                      <span className="workspace-search-item-title">{item.title}</span>
                      {item.badge && (
                        <span className={`badge badge-${item.badgeTone || 'default'}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="workspace-search-item-sub">{item.subtitle}</span>
                  </div>
                  <div className="workspace-search-item-action">
                    <ArrowRight size={14} />
                  </div>
                </div>
              )
            })
          ) : (
            <div className="workspace-search-empty">
              <Search size={28} style={{ color: '#4a6b61', marginBottom: '8px' }} />
              <p>No workspace artifacts matched <strong>"{query}"</strong></p>
              <div className="search-suggestions">
                <span>Try searching for:</span>
                <button type="button" onClick={() => setQuery('fall detection')}>fall detection</button>
                <button type="button" onClick={() => setQuery('sensor')}>sensor</button>
                <button type="button" onClick={() => setQuery('bluetooth')}>bluetooth</button>
                <button type="button" onClick={() => setQuery('critical')}>critical</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="workspace-search-footer">
          <div className="search-keyboard-hints">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Open</span>
            <span><kbd>esc</kbd> Dismiss</span>
          </div>
          <span className="search-current-project">Project: <b>{project.name}</b></span>
        </div>
      </div>
    </div>
  )
}
