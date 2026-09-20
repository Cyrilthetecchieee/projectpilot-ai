import React, { useState, useMemo } from 'react'
import {
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TestTube2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import type { Project, TestCase } from '../types'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'
import './TestingView.css'

interface TestingViewProps {
  project: Project
  refresh: () => void
}

type TestStatusFilter = 'All' | 'Pending' | 'Passed' | 'Failed'

export function TestingView({ project, refresh }: TestingViewProps) {
  const [running, setRunning] = useState(false)
  const [runningAll, setRunningAll] = useState(false)
  const [runningSingleId, setRunningSingleId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TestStatusFilter>('All')

  // Add Test Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTest, setNewTest] = useState<{
    id: string
    scenario: string
    precondition: string
    expected: string
    status: TestCase['status']
  }>({
    id: '',
    scenario: '',
    precondition: '',
    expected: '',
    status: 'Pending',
  })

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  // Executive KPIs
  const totalTests = project.tests.length
  const passedCount = useMemo(
    () => project.tests.filter(t => t.status === 'Passed').length,
    [project.tests]
  )
  const pendingCount = useMemo(
    () => project.tests.filter(t => t.status === 'Pending').length,
    [project.tests]
  )
  const failedCount = useMemo(
    () => project.tests.filter(t => t.status === 'Failed').length,
    [project.tests]
  )
  const passRate = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return project.tests.filter(test => {
      const matchesSearch =
        searchQuery === '' ||
        test.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.scenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.precondition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.expected.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'All' || test.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [project.tests, searchQuery, statusFilter])

  // AI Agent Generation Trigger
  const handleGenerateTests = async () => {
    setRunning(true)
    setError('')
    try {
      const result = await agentService.generateTests(project)
      const current = projectService.getProject(project.id)!
      projectService.saveProject({
        ...current,
        tests: result.tests,
        activity: [
          {
            id: `a-${Date.now()}`,
            agent: 'Test Agent',
            action: 'Generate Verification Strategy',
            status: 'Completed',
            duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`,
            createdAt: 'Just now',
            provider: result.analysis.provider,
            model: result.analysis.model,
            summary: `${result.tests.length} automated test scenarios generated`,
          },
          ...current.activity,
        ],
      })
      showToast('Verification strategy synthesized from engineering context.')
      refresh()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Verification strategy generation could not be completed.'
      )
    } finally {
      setRunning(false)
    }
  }

  // Simulate Running All Tests
  const handleRunAllTests = () => {
    setRunningAll(true)
    setTimeout(() => {
      const current = projectService.getProject(project.id)!
      const updatedTests = current.tests.map(t => ({
        ...t,
        status: (t.status === 'Failed' ? 'Failed' : 'Passed') as TestCase['status'],
      }))
      projectService.saveProject({
        ...current,
        tests: updatedTests,
      })
      setRunningAll(false)
      showToast(`Test suite execution complete. ${updatedTests.filter(t => t.status === 'Passed').length} passed.`)
      refresh()
    }, 1200)
  }

  // Run Single Test Simulation
  const handleRunSingleTest = (testId: string) => {
    setRunningSingleId(testId)
    setTimeout(() => {
      projectService.updateTestCase(testId, { status: 'Passed' }, project.id)
      setRunningSingleId(null)
      showToast(`Test scenario ${testId} executed: PASSED`)
      refresh()
    }, 650)
  }

  // Update Status Inline
  const handleStatusChange = (testId: string, status: TestCase['status']) => {
    projectService.updateTestCase(testId, { status }, project.id)
    showToast(`Test ${testId} status updated to ${status}`)
    refresh()
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    const nextNum = project.tests.length + 1
    setNewTest({
      id: `TEST-${String(nextNum).padStart(2, '0')}`,
      scenario: '',
      precondition: '',
      expected: '',
      status: 'Pending',
    })
    setIsAddModalOpen(true)
  }

  // Save New Test
  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTest.scenario.trim()) return

    const testItem: TestCase = {
      id: newTest.id.trim() || `TEST-${Date.now().toString().slice(-3)}`,
      scenario: newTest.scenario.trim(),
      precondition: newTest.precondition.trim() || 'System initialized in normal state.',
      expected: newTest.expected.trim() || 'Expected telemetry response matches specifications.',
      status: newTest.status,
    }

    projectService.addTestCase(testItem, project.id)
    showToast(`Added test scenario ${testItem.id}`)
    setIsAddModalOpen(false)
    refresh()
  }

  // Delete Test
  const handleDeleteTest = (testId: string) => {
    if (window.confirm(`Are you sure you want to delete test ${testId}?`)) {
      projectService.deleteTestCase(testId, project.id)
      showToast(`Deleted ${testId}`)
      refresh()
    }
  }

  return (
    <div className="testing-page">
      {/* Header */}
      <div className="test-header-row">
        <div className="test-header-left">
          <span className="eyebrow">VERIFICATION & SAFETY ASSURANCE</span>
          <h1>Testing & Validation</h1>
          <p>
            Measurable verification scenarios proving sensor fallbacks, threshold boundaries,
            and end-to-end telemetry safety requirements.
          </p>
        </div>
        <div className="test-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRunAllTests}
            disabled={runningAll || totalTests === 0}
          >
            {runningAll ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Simulating Suite...</span>
              </>
            ) : (
              <>
                <Play size={15} />
                <span>Run All Tests</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenAddModal}
          >
            <Plus size={15} />
            <span>Add Test</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleGenerateTests}
            disabled={running}
          >
            {running ? (
              <>
                <RefreshCw size={15} className="spin-icon" />
                <span>Generating Strategy...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Generate Test Cases</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Executive KPI Metric Ribbon */}
      <div className="test-kpi-grid">
        <div className="test-kpi-card">
          <div className="test-kpi-top">
            <span className="test-kpi-label">TOTAL SCENARIOS</span>
            <span className="test-kpi-icon"><TestTube2 size={15} /></span>
          </div>
          <div className="test-kpi-val">{totalTests}</div>
          <div className="test-kpi-sub">Validation scenarios</div>
        </div>

        <div className="test-kpi-card">
          <div className="test-kpi-top">
            <span className="test-kpi-label">PASS RATE</span>
            <span className="test-kpi-icon"><CheckCircle2 size={15} /></span>
          </div>
          <div className="test-kpi-val" style={{ color: 'var(--lime)' }}>{passRate}%</div>
          <div className="test-kpi-sub">{passedCount} passing of {totalTests}</div>
        </div>

        <div className="test-kpi-card">
          <div className="test-kpi-top">
            <span className="test-kpi-label">PASSED</span>
            <span className="test-kpi-icon"><FileCheck size={15} /></span>
          </div>
          <div className="test-kpi-val" style={{ color: 'var(--lime)' }}>{passedCount}</div>
          <div className="test-kpi-sub">Verified functional</div>
        </div>

        <div className="test-kpi-card">
          <div className="test-kpi-top">
            <span className="test-kpi-label">PENDING</span>
            <span
              className="test-kpi-icon"
              style={{
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              <Clock size={15} />
            </span>
          </div>
          <div className="test-kpi-val" style={{ color: '#fbbf24' }}>{pendingCount}</div>
          <div className="test-kpi-sub">Awaiting verification</div>
        </div>

        <div className="test-kpi-card">
          <div className="test-kpi-top">
            <span className="test-kpi-label">FAILED</span>
            <span
              className="test-kpi-icon"
              style={{
                color: failedCount > 0 ? '#f87171' : '#728c84',
                background: failedCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(24, 43, 35, 0.7)',
                borderColor: failedCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(54, 80, 57, 0.5)',
              }}
            >
              <XCircle size={15} />
            </span>
          </div>
          <div className="test-kpi-val" style={{ color: failedCount > 0 ? '#f87171' : '#ffffff' }}>
            {failedCount}
          </div>
          <div className="test-kpi-sub">{failedCount > 0 ? 'Fix required' : 'No regressions'}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="test-toolbar">
        <div className="test-toolbar-left">
          <div className="test-search-box">
            <Search size={14} style={{ color: '#688279' }} />
            <input
              type="text"
              placeholder="Search scenarios, preconditions, expected outcomes..."
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

          <div className="test-pills">
            {(['All', 'Pending', 'Passed', 'Failed'] as TestStatusFilter[]).map(status => (
              <button
                key={status}
                type="button"
                className={`test-pill-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="agent-error panel">
          <strong>Test Agent could not complete the analysis.</strong>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={handleGenerateTests}>
            Retry Generation
          </button>
        </div>
      )}

      {/* Tests Table */}
      <div className="test-table-wrap">
        <div className="test-table-header">
          <span>ID</span>
          <span>SCENARIO</span>
          <span>PRECONDITION</span>
          <span>EXPECTED RESULT</span>
          <span>STATUS</span>
          <span style={{ textAlign: 'right' }}>ACTIONS</span>
        </div>

        <div className="test-table-body">
          {filteredTests.length === 0 ? (
            <div className="req-empty">
              <TestTube2 size={34} style={{ color: '#4a675e' }} />
              <h3>No test cases match your filter</h3>
              <p>Adjust your search keywords or generate an automated verification strategy with the Test Agent.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('All')
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredTests.map(test => (
              <div className="test-row-item" key={test.id}>
                <div>
                  <span className="test-id-tag">{test.id}</span>
                </div>

                <div className="test-scenario-col">
                  <strong>{test.scenario}</strong>
                </div>

                <div>
                  <div className="test-detail-box">{test.precondition}</div>
                </div>

                <div>
                  <div className="test-detail-box">{test.expected}</div>
                </div>

                <div>
                  <select
                    className={`test-status-pill test-status-${test.status.toLowerCase()}`}
                    value={test.status}
                    onChange={e => handleStatusChange(test.id, e.target.value as TestCase['status'])}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                <div className="test-actions-cell">
                  <button
                    type="button"
                    className="test-run-single-btn"
                    title="Simulate test run"
                    onClick={() => handleRunSingleTest(test.id)}
                    disabled={runningSingleId === test.id}
                  >
                    {runningSingleId === test.id ? (
                      <RefreshCw size={12} className="spin-icon" />
                    ) : (
                      <Play size={12} />
                    )}
                    <span>Run</span>
                  </button>

                  <button
                    type="button"
                    className="req-icon-btn danger"
                    title={`Delete ${test.id}`}
                    onClick={() => handleDeleteTest(test.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Test Modal */}
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
            <span className="eyebrow">VERIFICATION SCENARIO</span>
            <h2>Add Test Scenario</h2>
            <p>Define conditions and expected outcomes to prove system safety and functionality.</p>

            <form onSubmit={handleSaveTest} className="req-modal-form">
              <div className="req-form-row">
                <label>
                  Test ID
                  <input
                    required
                    type="text"
                    value={newTest.id}
                    onChange={e => setNewTest({ ...newTest, id: e.target.value })}
                    placeholder="TEST-01"
                  />
                </label>

                <label>
                  Initial Status
                  <select
                    value={newTest.status}
                    onChange={e => setNewTest({ ...newTest, status: e.target.value as TestCase['status'] })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </label>
              </div>

              <label>
                Test Scenario
                <input
                  required
                  type="text"
                  value={newTest.scenario}
                  onChange={e => setNewTest({ ...newTest, scenario: e.target.value })}
                  placeholder="e.g. Accelerometer impact detection beyond threshold"
                />
              </label>

              <label>
                Preconditions
                <textarea
                  required
                  rows={2}
                  value={newTest.precondition}
                  onChange={e => setNewTest({ ...newTest, precondition: e.target.value })}
                  placeholder="e.g. System powered on, IMU calibrated, sensor in nominal state..."
                />
              </label>

              <label>
                Expected Result
                <textarea
                  required
                  rows={2}
                  value={newTest.expected}
                  onChange={e => setNewTest({ ...newTest, expected: e.target.value })}
                  placeholder="e.g. Emergency alert dispatched with valid GPS coordinates within 2 seconds..."
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
                  Save Scenario
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
