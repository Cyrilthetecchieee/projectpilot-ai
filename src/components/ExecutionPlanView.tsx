import React, { useState, useMemo } from 'react'
import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleDot,
  Clock,
  Cpu,
  FileText,
  Flame,
  Layers,
  Link2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import type { Priority, Project, Task, TaskStatus } from '../types'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'
import { TaskExecutionModal } from './TaskExecutionModal'
import { ReportIssueModal } from './ReportIssueModal'
import './ExecutionPlanView.css'

interface ExecutionPlanViewProps {
  project: Project
  refresh: () => void
}

type StatusFilter = 'All' | 'Completed' | 'In Progress' | 'Pending' | 'Critical Path'

export function ExecutionPlanView({ project, refresh }: ExecutionPlanViewProps) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [reportTask, setReportTask] = useState<Task | null>(null)

  // Filters & Search State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<string>('All')
  const [milestoneFilter, setMilestoneFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedMilestones, setCollapsedMilestones] = useState<Record<string, boolean>>({})

  // Add Task Modal State
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskMilestone, setNewTaskMilestone] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('High')
  const [newTaskEffort, setNewTaskEffort] = useState('1d')
  const [newTaskCriteria, setNewTaskCriteria] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  // Generate Plan via AI Planner Agent
  const handleGeneratePlan = async () => {
    setRunning(true)
    setError('')
    try {
      const result = await agentService.generatePlan(project)
      const current = projectService.getProject(project.id)!
      projectService.saveProject({
        ...current,
        tasks: result.tasks,
        milestones: result.milestones,
        plannerSummary: result.analysis.summary,
        planningNotes: result.analysis.planning_notes,
        criticalPath: result.analysis.critical_path,
        activity: [
          {
            id: `a-${Date.now()}`,
            agent: 'Planner Agent',
            action: 'Generate Execution Plan',
            status: 'Completed',
            duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`,
            createdAt: 'Just now',
            provider: result.analysis.provider,
            model: result.analysis.model,
            summary: `${result.milestones.length} milestones, ${result.tasks.length} tasks planned`,
          },
          ...current.activity,
        ],
      })
      showToast('Execution plan generated from requirements and architecture.')
      refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Execution plan could not be generated.'
      )
    } finally {
      setRunning(false)
    }
  }

  // Update single task status
  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    projectService.updateTask(taskId, { status: newStatus }, project.id)
    showToast(`Task status set to "${newStatus}".`)
    refresh()
  }

  // Toggle checkbox directly (Completed <-> Pending)
  const handleToggleTask = (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed'
    projectService.updateTask(task.id, { status: nextStatus }, project.id)
    showToast(`Task marked as ${nextStatus.toLowerCase()}.`)
    refresh()
  }

  // Toggle milestone collapse
  const toggleMilestone = (milestoneName: string) => {
    setCollapsedMilestones(prev => ({
      ...prev,
      [milestoneName]: !prev[milestoneName],
    }))
  }

  const allMilestones = useMemo(() => {
    const fromTasks = project.tasks.map(t => t.milestone)
    const fromProject = project.milestones?.map(m => m.title) || []
    return Array.from(new Set([...fromTasks, ...fromProject]))
  }, [project.tasks, project.milestones])

  const toggleAllMilestones = () => {
    const anyCollapsed = allMilestones.some(m => collapsedMilestones[m])
    const nextState: Record<string, boolean> = {}
    allMilestones.forEach(m => {
      nextState[m] = !anyCollapsed
    })
    setCollapsedMilestones(nextState)
  }

  // Add new custom task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const selectedMilestone = newTaskMilestone || allMilestones[0] || 'General'
    const nextIdNumber = project.tasks.length + 1
    const newTask: Task = {
      id: `T-${String(nextIdNumber).padStart(2, '0')}`,
      title: newTaskTitle.trim(),
      milestone: selectedMilestone,
      priority: newTaskPriority,
      status: 'Pending',
      estimatedEffort: newTaskEffort.trim() || '1d',
      successCriteria: newTaskCriteria.trim() || 'Task completion verified.',
      successCriteriaList: newTaskCriteria.trim() ? [newTaskCriteria.trim()] : ['Task completion verified.'],
    }

    projectService.addTask(newTask, project.id)
    showToast(`Task "${newTask.title}" added to ${selectedMilestone}.`)
    setAddTaskModalOpen(false)
    setNewTaskTitle('')
    setNewTaskCriteria('')
    refresh()
  }

  // Metrics computation
  const totalCount = project.tasks.length
  const completedCount = project.tasks.filter(t => t.status === 'Completed').length
  const inProgressCount = project.tasks.filter(t => t.status === 'In Progress').length
  const pendingCount = project.tasks.filter(t => t.status === 'Pending').length
  const criticalPathCount = project.tasks.filter(t => t.isCriticalPath).length

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return project.tasks.filter(task => {
      // Status filter
      if (statusFilter === 'Completed' && task.status !== 'Completed') return false
      if (statusFilter === 'In Progress' && task.status !== 'In Progress') return false
      if (statusFilter === 'Pending' && task.status !== 'Pending') return false
      if (statusFilter === 'Critical Path' && !task.isCriticalPath) return false

      // Priority filter
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false

      // Milestone filter
      if (milestoneFilter !== 'All' && task.milestone !== milestoneFilter) return false

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(q)
        const matchesId = task.id.toLowerCase().includes(q)
        const matchesMilestone = task.milestone.toLowerCase().includes(q)
        const matchesCriteria = (task.successCriteria || '').toLowerCase().includes(q)
        const matchesDeps = (task.dependencies || []).some(d => d.toLowerCase().includes(q))
        const matchesReqs = (task.relatedRequirements || []).some(r => r.toLowerCase().includes(q))
        const matchesComps = (task.relatedComponents || []).some(c => c.toLowerCase().includes(q))
        if (!matchesTitle && !matchesId && !matchesMilestone && !matchesCriteria && !matchesDeps && !matchesReqs && !matchesComps) {
          return false
        }
      }

      return true
    })
  }, [project.tasks, statusFilter, priorityFilter, milestoneFilter, searchQuery])

  // Group filtered tasks by milestone
  const filteredGroups = useMemo(() => {
    const groups: { name: string; tasks: Task[] }[] = []
    const targetMilestones = milestoneFilter !== 'All' ? [milestoneFilter] : allMilestones

    targetMilestones.forEach(milestoneName => {
      const tasksInGroup = filteredTasks.filter(t => t.milestone === milestoneName)
      // Only include if not searching or if there are tasks
      if (tasksInGroup.length > 0 || (searchQuery === '' && statusFilter === 'All' && priorityFilter === 'All')) {
        groups.push({ name: milestoneName, tasks: tasksInGroup })
      }
    })

    return groups
  }, [filteredTasks, milestoneFilter, allMilestones, searchQuery, statusFilter, priorityFilter])

  const hasActiveFilters = statusFilter !== 'All' || priorityFilter !== 'All' || milestoneFilter !== 'All' || searchQuery !== ''

  const clearAllFilters = () => {
    setStatusFilter('All')
    setPriorityFilter('All')
    setMilestoneFilter('All')
    setSearchQuery('')
  }

  return (
    <div className="execution-page-container">
      {/* Top Page Header */}
      <div className="page-header">
        <div>
          <span className="eyebrow">EXECUTION</span>
          <h1>Execution Plan</h1>
          <p>Milestones and dependency-aware tasks that turn the design into a working system.</p>
        </div>

        <div className="execution-header-actions">
          <button
            type="button"
            className="btn-add-task"
            onClick={() => {
              setNewTaskMilestone(allMilestones[0] || 'Requirements & Design')
              setAddTaskModalOpen(true)
            }}
          >
            <Plus size={15} />
            <span>Add Task</span>
          </button>

          <button
            type="button"
            className="btn btn-generate-plan"
            onClick={handleGeneratePlan}
            disabled={running}
          >
            {running ? <RefreshCw size={15} className="spin" /> : <Sparkles size={15} />}
            <span>{running ? 'Planning...' : 'Generate Execution Plan'}</span>
          </button>
        </div>
      </div>

      {/* Planner Agent Running State */}
      {running && (
        <div className="agent-progress panel">
          <div className="simulation-state">
            <span className="running-icon">
              <Sparkles size={18} />
            </span>
            <div>
              <strong>Planner Agent</strong>
              <span>Powered by NVIDIA Nemotron</span>
            </div>
          </div>
          <div>
            <p>Building dependency graph, scheduling milestones, and ordering engineering tasks.</p>
            <div className="progress-step">
              <span className="step-done"><Check size={12} /></span>
              Loading persisted requirements and architecture...
            </div>
            <div className="progress-step">
              <span className="step-done"><Check size={12} /></span>
              Nemotron is generating dependency-aware tasks...
            </div>
            <div className="progress-step">
              <span><CircleDot size={12} /></span>
              Validating milestone and critical path references...
            </div>
            <div className="progress-step">
              <span><CircleDot size={12} /></span>
              Saving execution plan artifacts...
            </div>
          </div>
        </div>
      )}

      {/* Generation Error Banner */}
      {error && (
        <div className="agent-error panel">
          <strong>Planner Agent could not generate the execution plan.</strong>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={handleGeneratePlan}>Retry</button>
        </div>
      )}

      {!running && (
        <>
          {/* Executive Interactive Stats Cards */}
          <div className="execution-stats-grid">
            <button
              type="button"
              className={`stat-card-btn stat-all ${statusFilter === 'All' ? 'active' : ''}`}
              onClick={() => setStatusFilter('All')}
            >
              <div className="stat-top">
                <span>Total Tasks</span>
                <span className="stat-indicator" />
              </div>
              <div className="stat-num">{totalCount}</div>
            </button>

            <button
              type="button"
              className={`stat-card-btn stat-completed ${statusFilter === 'Completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'All' : 'Completed')}
            >
              <div className="stat-top">
                <span>Completed</span>
                <span className="stat-indicator" />
              </div>
              <div className="stat-num">{completedCount}</div>
            </button>

            <button
              type="button"
              className={`stat-card-btn stat-progress ${statusFilter === 'In Progress' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'All' : 'In Progress')}
            >
              <div className="stat-top">
                <span>In Progress</span>
                <span className="stat-indicator" />
              </div>
              <div className="stat-num">{inProgressCount}</div>
            </button>

            <button
              type="button"
              className={`stat-card-btn stat-pending ${statusFilter === 'Pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
            >
              <div className="stat-top">
                <span>Pending</span>
                <span className="stat-indicator" />
              </div>
              <div className="stat-num">{pendingCount}</div>
            </button>

            <button
              type="button"
              className={`stat-card-btn stat-critical ${statusFilter === 'Critical Path' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'Critical Path' ? 'All' : 'Critical Path')}
            >
              <div className="stat-top">
                <span>Critical Path</span>
                <span className="stat-indicator" />
              </div>
              <div className="stat-num">{criticalPathCount}</div>
            </button>
          </div>

          {/* AI Planner Summary Panel */}
          {project.plannerSummary && (
            <div className="planner-summary-panel panel">
              <div className="planner-summary-top">
                <span className="planner-summary-chip">
                  <Sparkles size={13} />
                  EXECUTION PLAN SUMMARY · PLANNER AGENT
                </span>
                {project.criticalPath && (
                  <span className="badge-critical-path">
                    <Flame size={11} /> {project.criticalPath.length} Critical Path Tasks
                  </span>
                )}
              </div>
              <p className="planner-summary-desc">{project.plannerSummary}</p>

              {project.planningNotes && project.planningNotes.length > 0 && (
                <div className="planning-notes-wrap">
                  <span className="planning-notes-title">PLANNING INSIGHTS & EXECUTION NOTES</span>
                  <div className="planning-notes-list">
                    {project.planningNotes.map((note, i) => (
                      <div className="planning-note-item" key={i}>{note}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search, Filter & View Controls Toolbar */}
          <div className="execution-toolbar">
            <div className="execution-toolbar-left">
              <div className="execution-search-wrap">
                <Search size={14} />
                <input
                  type="text"
                  className="execution-search-input"
                  placeholder="Search tasks, IDs, criteria, dependencies..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Priority Filter */}
              <select
                className="execution-filter-select"
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                title="Filter by priority"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Milestone Filter */}
              <select
                className="execution-filter-select"
                value={milestoneFilter}
                onChange={e => setMilestoneFilter(e.target.value)}
                title="Filter by milestone"
              >
                <option value="All">All Milestones</option>
                {allMilestones.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="execution-toolbar-right">
              {hasActiveFilters && (
                <span className="active-filter-badge">
                  Filtered ({filteredTasks.length} of {totalCount})
                  <button type="button" onClick={clearAllFilters} title="Reset filters">
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                type="button"
                className="btn-toggle-all"
                onClick={toggleAllMilestones}
                title="Toggle milestone groups"
              >
                <Layers size={13} />
                <span>Toggle All</span>
              </button>
            </div>
          </div>

          {/* Milestones List */}
          {filteredGroups.length > 0 ? (
            <div className="milestones-list">
              {filteredGroups.map((group, groupIndex) => {
                const totalInMilestone = project.tasks.filter(t => t.milestone === group.name).length
                const completedInMilestone = project.tasks.filter(t => t.milestone === group.name && t.status === 'Completed').length
                const percent = totalInMilestone > 0 ? Math.round((completedInMilestone / totalInMilestone) * 100) : 0
                const isCollapsed = Boolean(collapsedMilestones[group.name])

                return (
                  <div
                    className={`milestone-panel ${!isCollapsed ? 'is-open' : ''}`}
                    key={group.name}
                  >
                    {/* Milestone Accordion Header */}
                    <div
                      className="milestone-header-row"
                      onClick={() => toggleMilestone(group.name)}
                    >
                      <div className="milestone-meta-left">
                        <span className="milestone-seq-badge">
                          0{groupIndex + 1}
                        </span>
                        <div className="milestone-title-block">
                          <h2>{group.name}</h2>
                          <span className="milestone-progress-text">
                            {completedInMilestone} of {totalInMilestone} complete · {percent}%
                          </span>
                        </div>
                      </div>

                      <div className="milestone-meta-right">
                        <div className="milestone-progress-bar-wrap">
                          <div className="progress">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                        <ChevronDown size={17} className="milestone-toggle-chevron" />
                      </div>
                    </div>

                    {/* Milestone Task Items (when expanded) */}
                    {!isCollapsed && (
                      <div className="milestone-tasks-container">
                        {group.tasks.length > 0 ? (
                          group.tasks.map(task => {
                            const isCompleted = task.status === 'Completed'
                            const isInProgress = task.status === 'In Progress'

                            return (
                              <div
                                key={task.id}
                                className={`task-item-card ${task.isCriticalPath ? 'is-critical-path' : ''} ${isCompleted ? 'is-completed' : ''}`}
                              >
                                {/* Left Checkbox */}
                                <button
                                  type="button"
                                  className={`task-check-button ${isCompleted ? 'checked' : ''}`}
                                  onClick={() => handleToggleTask(task)}
                                  title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                                >
                                  {isCompleted && <Check size={13} strokeWidth={3} />}
                                </button>

                                {/* Task Main Info */}
                                <div className="task-main-content">
                                  <div className="task-heading-row">
                                    <span className="task-id-tag">{task.id}</span>
                                    <span className="task-title-text">{task.title}</span>

                                    {isCompleted && (
                                      <span className="badge-task-completed">
                                        <Check size={10} strokeWidth={2.5} /> COMPLETED
                                      </span>
                                    )}

                                    {task.isCriticalPath && (
                                      <span className="badge-critical-path">
                                        <Flame size={10} /> CRITICAL PATH
                                      </span>
                                    )}

                                    {task.estimatedEffort && (
                                      <span className="badge-effort-pill">
                                        <Clock size={10} /> {task.estimatedEffort}
                                      </span>
                                    )}
                                  </div>

                                  {/* Success Criteria / Description */}
                                  <p className="task-criteria-preview">
                                    {task.successCriteriaList?.[0] || task.successCriteria || 'Safe criteria verified.'}
                                  </p>

                                  {/* Metadata Chips: Dependencies, Requirements, Components */}
                                  <div className="task-metadata-chips">
                                    {task.dependencies && task.dependencies.length > 0 && (
                                      <span className="task-meta-chip chip-dependency">
                                        <Link2 size={10} /> Depends on: {task.dependencies.join(', ')}
                                      </span>
                                    )}
                                    {task.relatedRequirements && task.relatedRequirements.length > 0 && (
                                      <span className="task-meta-chip chip-req">
                                        <FileText size={10} /> {task.relatedRequirements.join(', ')}
                                      </span>
                                    )}
                                    {task.relatedComponents && task.relatedComponents.length > 0 && (
                                      <span className="task-meta-chip chip-comp">
                                        <Cpu size={10} /> {task.relatedComponents.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right Actions Cluster (Fixed layout, NEVER squished or wrapped!) */}
                                <div className="task-actions-group">
                                  {/* Task Runner Trigger Button */}
                                  <button
                                    type="button"
                                    className={`btn-task-runner ${isCompleted ? 'state-completed' : isInProgress ? 'state-progress' : 'state-pending'}`}
                                    onClick={() => setSelectedTask(task)}
                                    title="Open Task Execution Runner"
                                  >
                                    <Play size={11} />
                                    <span>
                                      {isCompleted ? 'Review' : isInProgress ? 'Resume' : 'Start'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="btn-task-runner btn-report-issue"
                                    onClick={() => setReportTask(task)}
                                    title="Report an issue with this task"
                                  >
                                    <CircleAlert size={11} />
                                    <span>Report Issue</span>
                                  </button>

                                  {/* Priority Badge */}
                                  <span className={`task-priority-badge priority-${task.priority.toLowerCase()}`}>
                                    {task.priority}
                                  </span>

                                  {/* Status Selector Dropdown */}
                                  <div className={`task-status-selector-wrap status-${task.status.toLowerCase().replace(' ', '-')}`}>
                                    <span className="status-dot-indicator" />
                                    <select
                                      className="task-status-select-native"
                                      value={task.status}
                                      onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                                      title="Update status"
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Completed">Completed</option>
                                    </select>
                                    <ChevronDown size={11} className="status-arrow-icon" />
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="milestone-empty-notice">
                            No tasks in this milestone match the current filters.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="execution-empty-state">
              <CircleAlert size={28} color="var(--muted)" />
              <h3>No tasks found</h3>
              <p>No tasks match your current filter and search criteria.</p>
              <button type="button" className="btn btn-secondary" onClick={clearAllFilters}>
                Reset all filters
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Task Modal */}
      {addTaskModalOpen && (
        <div className="add-task-modal-backdrop" onClick={() => setAddTaskModalOpen(false)}>
          <div className="add-task-modal-card" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setAddTaskModalOpen(false)}
            >
              <X size={18} />
            </button>

            <h2>Add Execution Task</h2>
            <p>Add a new actionable task directly into your project's execution plan.</p>

            <form onSubmit={handleCreateTask} className="add-task-form">
              <label>
                Task Title
                <input
                  type="text"
                  required
                  placeholder="e.g., Integrate watchdog timer for BLE disconnected state"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                />
              </label>

              <div className="add-task-grid">
                <label>
                  Milestone
                  <select
                    value={newTaskMilestone}
                    onChange={e => setNewTaskMilestone(e.target.value)}
                  >
                    {allMilestones.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as Priority)}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
              </div>

              <div className="add-task-grid">
                <label>
                  Estimated Effort
                  <input
                    type="text"
                    placeholder="e.g. 1d, 4h, 30–45 min"
                    value={newTaskEffort}
                    onChange={e => setNewTaskEffort(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Success Criteria
                <textarea
                  placeholder="What proves this task has been safely completed?"
                  value={newTaskCriteria}
                  onChange={e => setNewTaskCriteria(e.target.value)}
                  rows={3}
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  <Plus size={14} /> Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* Report Issue Modal */}
      {reportTask && (
        <ReportIssueModal
          isOpen={Boolean(reportTask)}
          onClose={() => setReportTask(null)}
          task={reportTask}
          project={project}
          refresh={refresh}
        />
      )}

      {/* Task Execution Runner Modal */}
      {selectedTask && (
        <TaskExecutionModal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          project={project}
          refresh={refresh}
          targetTask={selectedTask}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Close notification">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
