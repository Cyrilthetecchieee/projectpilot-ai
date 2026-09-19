import React, { useState } from 'react'
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { apiKeyService } from '../services/apiKeyService'
import type {
  CredentialMetadata,
  Project,
} from '../types'
import { CreateNewApiKeyModal } from './CreateNewApiKeyModal'

interface ApiKeysViewProps {
  project: Project
  onEngineChange?: () => void
}

export function ApiKeysView({ project, onEngineChange }: ApiKeysViewProps) {
  const [credentials, setCredentials] = useState<CredentialMetadata[]>(() =>
    apiKeyService.getCredentialsSync()
  )
  const [engineStatus, setEngineStatus] = useState(() => apiKeyService.getAiEngineStatus())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'Active' | 'Revoked'>('all')
  const [toast, setToast] = useState('')

  // Single modal state for "+ Create New API Key"
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Details & Rotate modal targets for table row actions
  const [activeModal, setActiveModal] = useState<'none' | 'details' | 'rotate'>('none')
  const [selectedCredential, setSelectedCredential] = useState<CredentialMetadata | null>(null)
  const [rotateNewSecret, setRotateNewSecret] = useState('')
  const [showRotateSecretText, setShowRotateSecretText] = useState(false)
  const [formError, setFormError] = useState('')

  // Row copy feedback
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Connection testing & code snippet
  const [quickTestKey, setQuickTestKey] = useState('')
  const [testResult, setTestResult] = useState<{ message: string; valid: boolean } | null>(null)
  const [codeTab, setCodeTab] = useState<'curl' | 'ts' | 'python'>('curl')

  const showNotification = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const reload = () => {
    const updated = apiKeyService.getCredentialsSync()
    setCredentials(updated)
    setEngineStatus(apiKeyService.getAiEngineStatus())
    if (onEngineChange) onEngineChange()
  }

  const handleKeySaved = (cred: CredentialMetadata) => {
    reload()
    showNotification(`API Key "${cred.name}" added successfully.`)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 2000)
    showNotification('Copied masked reference.')
  }

  // Rotate Credential
  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCredential) return
    setFormError('')

    try {
      const res = await apiKeyService.rotateCredential(
        selectedCredential.id,
        selectedCredential.credentialType === 'PROVIDER_API_KEY' ? rotateNewSecret : undefined
      )

      reload()
      setActiveModal('none')
      showNotification(`Credential "${res.credential.name}" rotated successfully.`)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Rotation failed')
    }
  }

  const handleRevoke = async (id: string) => {
    const target = credentials.find(c => c.id === id)
    await apiKeyService.revokeCredential(id)
    reload()
    showNotification(`Credential "${target?.name || 'Key'}" has been revoked.`)
  }

  const handleDelete = async (id: string) => {
    const target = credentials.find(c => c.id === id)
    if (window.confirm(`Permanently remove "${target?.name || 'this credential'}" from your workspace?`)) {
      await apiKeyService.deleteCredential(id)
      reload()
      showNotification('Credential deleted.')
    }
  }

  const handleTestConnection = (e: React.FormEvent) => {
    e.preventDefault()
    const query = quickTestKey.trim() || (credentials[0]?.id ?? '')
    const res = apiKeyService.validateApiKey(query)
    setTestResult(res)
    reload()
  }

  // Filtered credentials list
  const filteredCredentials = credentials.filter(item => {
    const matchesFilter = filter === 'all' ? true : item.status === filter
    const query = search.toLowerCase().trim()
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.provider.toLowerCase().includes(query) ||
      item.credentialType.toLowerCase().includes(query) ||
      item.maskedValue.toLowerCase().includes(query)
    return matchesFilter && matchesSearch
  })

  // Dynamic statistics based on actual credentials stored
  const totalKeys = credentials.length
  const activeKeys = credentials.filter(k => k.status === 'Active').length
  const revokedKeys = credentials.filter(k => k.status === 'Revoked').length
  const authScopesActive = credentials
    .filter(k => k.status === 'Active')
    .reduce((acc, k) => {
      k.permissions.forEach(p => acc.add(p))
      return acc
    }, new Set<string>()).size

  return (
    <div className="api-keys-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <span className="eyebrow">WORKSPACE SECURITY & INTEGRATIONS</span>
          <h1>API Keys & Agent Tokens</h1>
          <p>
            Create, configure and manage API keys for external agent runners, CI/CD automation, and
            connecting LLM reasoning models.
          </p>
        </div>

        {/* Top actions: Single primary button */}
        <div className="header-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            Create New API Key
          </button>
        </div>
      </div>

      {/* Engine Status Banner: LIVE CONNECTED */}
      <div className="panel engine-banner">
        <div className="engine-banner-left">
          <div className="icon-box">
            <Zap size={20} />
          </div>
          <div>
            <div className="engine-tag">
              <span
                className={`status-dot ${engineStatus.mode === 'Live Connected' ? 'pulse-dot' : 'amber-dot'}`}
              />
              <span className="engine-mode-title">{engineStatus.mode.toUpperCase()}</span>
              <span className="badge badge-lime">{engineStatus.providerName}</span>
            </div>
            <p className="engine-desc">
              {engineStatus.mode === 'Live Connected'
                ? `Agents for "${project.name}" are authenticated via active credential [${
                    engineStatus.activeCredential?.name || 'Primary Key'
                  }]. Autonomous requests will invoke live reasoning models.`
                : `Currently in Simulation Mode. Connect your Google Gemini, OpenAI, or NVIDIA API Key to unlock live reasoning.`}
            </p>
          </div>
        </div>

        <div className="engine-banner-right">
          <form onSubmit={handleTestConnection} className="quick-verify-form">
            <input
              type="text"
              placeholder="Paste token or key name to test connection..."
              value={quickTestKey}
              onChange={e => setQuickTestKey(e.target.value)}
              className="quick-input"
            />
            <button type="submit" className="btn btn-secondary">
              <Terminal size={14} /> Test
            </button>
          </form>

          {testResult && (
            <div
              className={`test-feedback ${testResult.valid ? 'feedback-ok' : 'feedback-err'}`}
            >
              {testResult.valid ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Strip - Dynamic based on actual credentials */}
      <div className="metrics-strip">
        <span>
          <b>{totalKeys}</b> Total API Keys
        </span>
        <span>
          <b>{activeKeys}</b> Active Keys
        </span>
        <span>
          <b>{revokedKeys}</b> Revoked
        </span>
        <span>
          <b>{authScopesActive}</b> Auth Scopes Active
        </span>
      </div>

      {/* Search and Filters */}
      <div className="keys-toolbar">
        <div className="keys-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search keys by name, provider, credential type, or token suffix..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-row">
          <button
            type="button"
            className={filter === 'all' ? 'selected' : ''}
            onClick={() => setFilter('all')}
          >
            All Keys ({totalKeys})
          </button>
          <button
            type="button"
            className={filter === 'Active' ? 'selected' : ''}
            onClick={() => setFilter('Active')}
          >
            Active ({activeKeys})
          </button>
          <button
            type="button"
            className={filter === 'Revoked' ? 'selected' : ''}
            onClick={() => setFilter('Revoked')}
          >
            Revoked ({revokedKeys})
          </button>
        </div>
      </div>

      {/* Credentials Table with exact requested columns */}
      <div className="panel table-panel keys-table-panel">
        <div className="table-heading">
          <div>
            <h2>Configured Keys & Access Credentials</h2>
            <span>Credentials authorized to interact with the {project.name} workspace</span>
          </div>
          <span className="badge badge-lime">VAULT SECURED</span>
        </div>

        {filteredCredentials.length === 0 ? (
          <div className="empty-state">
            <Key size={32} />
            <h3>No credentials match your filter</h3>
            <p>Add your AI provider API key to configure this workspace.</p>
            <button
              type="button"
              className="btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={15} /> Create New API Key
            </button>
          </div>
        ) : (
          <div className="keys-table">
            <div className="keys-table-header">
              <span>KEY NAME</span>
              <span>PROVIDER</span>
              <span>TYPE</span>
              <span>ENVIRONMENT</span>
              <span>SCOPES</span>
              <span>LAST USED</span>
              <span>STATUS</span>
              <span style={{ textAlign: 'right' }}>ACTIONS</span>
            </div>

            {filteredCredentials.map(item => (
              <div
                className={`keys-table-row ${item.status === 'Revoked' ? 'row-revoked' : ''}`}
                key={item.id}
              >
                {/* KEY NAME & MASKED TOKEN */}
                <div className="key-identity">
                  <span className="key-name">{item.name}</span>
                  <div className="token-preview">
                    <code>{item.maskedValue}</code>
                    <button
                      type="button"
                      className="copy-mini-btn"
                      onClick={() => handleCopy(item.maskedValue, item.id)}
                      title="Copy masked reference"
                    >
                      {copiedKeyId === item.id ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKeyId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* PROVIDER */}
                <div>
                  <span className="provider-pill">
                    {item.provider === 'Google Gemini' && <Zap size={13} />}
                    {item.provider === 'OpenAI' && <Code2 size={13} />}
                    {item.provider === 'NVIDIA' && <Sparkles size={13} />}
                    {item.provider === 'Other' && <Shield size={13} />}
                    {item.provider}
                  </span>
                </div>

                {/* TYPE */}
                <div>
                  <span
                    className={`badge ${
                      item.credentialType === 'PLATFORM_TOKEN'
                        ? 'badge-platform'
                        : 'badge-provider'
                    }`}
                  >
                    {item.credentialType === 'PLATFORM_TOKEN'
                      ? 'Platform Token'
                      : 'Provider API Key'}
                  </span>
                </div>

                {/* ENVIRONMENT */}
                <div>
                  <span className={`env-badge env-${item.environment.toLowerCase()}`}>
                    {item.environment}
                  </span>
                </div>

                {/* SCOPES */}
                <div className="scopes-list">
                  {item.permissions.map(s => (
                    <span className="scope-tag" key={s}>
                      {s.replace('run:', '').replace(':project', '')}
                    </span>
                  ))}
                </div>

                {/* LAST USED */}
                <div className="key-meta">
                  <span className="last-used">{item.lastUsedAt || 'Never used'}</span>
                  <small className="created-date">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </small>
                </div>

                {/* STATUS */}
                <div>
                  <span
                    className={`badge ${
                      item.status === 'Active' ? 'badge-lime' : 'badge-critical'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>

                {/* ACTIONS MENU */}
                <div className="key-actions">
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => {
                      setSelectedCredential(item)
                      setActiveModal('details')
                    }}
                    title="View Credential Details"
                  >
                    <Info size={13} />
                    <span>Details</span>
                  </button>

                  {item.status === 'Active' ? (
                    <>
                      <button
                        type="button"
                        className="icon-action-btn rotate-btn"
                        onClick={() => {
                          setSelectedCredential(item)
                          setRotateNewSecret('')
                          setFormError('')
                          setActiveModal('rotate')
                        }}
                        title="Rotate Credential"
                      >
                        <RefreshCw size={13} />
                        <span>Rotate</span>
                      </button>

                      <button
                        type="button"
                        className="icon-action-btn revoke-btn"
                        onClick={() => handleRevoke(item.id)}
                        title="Revoke Credential"
                      >
                        <ShieldAlert size={13} />
                        <span>Revoke</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="icon-action-btn delete-btn"
                      onClick={() => handleDelete(item.id)}
                      title="Permanently Delete Credential"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Code Guide */}
      <div className="panel code-preview-panel">
        <div className="panel-heading">
          <div>
            <h2>SDK & CLI Integration Example</h2>
            <span>Authorize your engineering pipelines with ProjectPilot credentials</span>
          </div>
          <div className="code-tabs">
            <button
              type="button"
              className={codeTab === 'curl' ? 'active-tab' : ''}
              onClick={() => setCodeTab('curl')}
            >
              cURL
            </button>
            <button
              type="button"
              className={codeTab === 'ts' ? 'active-tab' : ''}
              onClick={() => setCodeTab('ts')}
            >
              TypeScript SDK
            </button>
            <button
              type="button"
              className={codeTab === 'python' ? 'active-tab' : ''}
              onClick={() => setCodeTab('python')}
            >
              Python Client
            </button>
          </div>
        </div>

        <div className="code-snippet-box">
          {codeTab === 'curl' && (
            <pre>
              <code>{`curl -X POST https://api.projectpilot.ai/v1/agents/run \\
  -H "Authorization: Bearer ${credentials[0]?.maskedValue || 'AIza...7X9'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "Requirement Agent",
    "mode": "exhaustive_analysis",
    "context": { "projectId": "${project.id}" }
  }'`}</code>
            </pre>
          )}

          {codeTab === 'ts' && (
            <pre>
              <code>{`import { ProjectPilotClient } from '@projectpilot/sdk'

const client = new ProjectPilotClient({
  apiKey: process.env.PROJECTPILOT_API_KEY, // e.g. ${credentials[0]?.maskedValue || 'AIza...7X9'}
  projectId: '${project.id}'
})

// Trigger reviewer agent
const risks = await client.agents.reviewProject({
  includeUnresolvedOnly: true,
  severityThreshold: 'High'
})
console.log('Detected engineering gaps:', risks.length)`}</code>
            </pre>
          )}

          {codeTab === 'python' && (
            <pre>
              <code>{`from projectpilot import ProjectPilot

pilot = ProjectPilot(
    api_key="${credentials[0]?.maskedValue || 'AIza...7X9'}",
    project_id="${project.id}"
)

# Run full project architecture and execution validation
plan = pilot.agents.generate_plan()
print(f"Generated {len(plan.tasks)} milestones for {pilot.project.name}")`}</code>
            </pre>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATE NEW API KEY MODAL (SINGLE UNIFIED MODAL)                        */}
      {/* ========================================================================= */}
      <CreateNewApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={handleKeySaved}
      />

      {/* ========================================================================= */}
      {/* 2. VIEW DETAILS MODAL                                                     */}
      {/* ========================================================================= */}
      {activeModal === 'details' && selectedCredential && (
        <div className="modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">CREDENTIAL METADATA</span>
                <h2>{selectedCredential.name}</h2>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setActiveModal('none')}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div className="details-modal-grid">
                <div className="detail-item">
                  <small>Credential Type</small>
                  <strong>
                    <span
                      className={`badge ${
                        selectedCredential.credentialType === 'PLATFORM_TOKEN'
                          ? 'badge-platform'
                          : 'badge-provider'
                      }`}
                    >
                      {selectedCredential.credentialType === 'PLATFORM_TOKEN'
                        ? 'Platform Token'
                        : 'Provider API Key'}
                    </span>
                  </strong>
                </div>

                <div className="detail-item">
                  <small>Provider / Model</small>
                  <strong>{selectedCredential.provider}</strong>
                </div>

                <div className="detail-item">
                  <small>Environment</small>
                  <strong>{selectedCredential.environment}</strong>
                </div>

                <div className="detail-item">
                  <small>Status</small>
                  <strong>
                    <span
                      className={`badge ${
                        selectedCredential.status === 'Active' ? 'badge-lime' : 'badge-critical'
                      }`}
                    >
                      {selectedCredential.status.toUpperCase()}
                    </span>
                  </strong>
                </div>

                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <small>Masked Token Reference</small>
                  <code style={{ fontFamily: 'var(--mono)', color: 'var(--lime)', marginTop: '4px' }}>
                    {selectedCredential.maskedValue}
                  </code>
                </div>

                <div className="detail-item">
                  <small>Created By</small>
                  <strong>{selectedCredential.createdBy}</strong>
                </div>

                <div className="detail-item">
                  <small>Created Date</small>
                  <strong>{new Date(selectedCredential.createdAt).toLocaleString()}</strong>
                </div>

                <div className="detail-item">
                  <small>Expiration</small>
                  <strong>
                    {selectedCredential.expiresAt
                      ? new Date(selectedCredential.expiresAt).toLocaleDateString()
                      : 'Never Expire'}
                  </strong>
                </div>

                <div className="detail-item">
                  <small>Last Used</small>
                  <strong>{selectedCredential.lastUsedAt || 'Never used'}</strong>
                </div>
              </div>

              <div>
                <small
                  style={{
                    color: '#6c8880',
                    fontFamily: 'var(--mono)',
                    fontSize: '9px',
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Authorized Permissions & Scopes
                </small>
                <div className="scopes-list">
                  {selectedCredential.permissions.map(s => (
                    <span className="scope-tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setActiveModal('none')}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ROTATE CREDENTIAL MODAL                                                */}
      {/* ========================================================================= */}
      {activeModal === 'rotate' && selectedCredential && (
        <div className="modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">CREDENTIAL ROTATION</span>
                <h2>Rotate {selectedCredential.name}</h2>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setActiveModal('none')}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRotate} className="modal-form">
              <p style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: 1.6 }}>
                {selectedCredential.credentialType === 'PLATFORM_TOKEN'
                  ? 'Rotating this platform token will generate a new secure secret and immediately invalidate the current one.'
                  : 'Enter the new API secret key from your provider to update this credential in your secure vault.'}
              </p>

              {selectedCredential.credentialType === 'PROVIDER_API_KEY' && (
                <label>
                  New Provider API Key Secret
                  <div className="manual-input-wrap">
                    <input
                      required
                      type={showRotateSecretText ? 'text' : 'password'}
                      placeholder="Paste new secret key..."
                      value={rotateNewSecret}
                      onChange={e => setRotateNewSecret(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowRotateSecretText(!showRotateSecretText)}
                    >
                      {showRotateSecretText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              )}

              {formError && <div className="form-error-banner">{formError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveModal('none')}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  <RefreshCw size={14} /> Confirm Rotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Close notification">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
