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
  Lock,
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
  ApiKeyProvider,
  CredentialMetadata,
  Project,
} from '../types'
import { CreateNewApiKeyModal } from './CreateNewApiKeyModal'
import './ApiKeysView.css'

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Revoked'>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
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
  const [codeCopied, setCodeCopied] = useState(false)

  // Connection testing & code snippet
  const [quickTestKey, setQuickTestKey] = useState('')
  const [testResult, setTestResult] = useState<{ message: string; valid: boolean } | null>(null)
  const [codeTab, setCodeTab] = useState<'curl' | 'ts' | 'python'>('curl')

  const showNotification = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  const reload = () => {
    const updated = apiKeyService.getCredentialsSync()
    setCredentials(updated)
    setEngineStatus(apiKeyService.getAiEngineStatus())
    if (onEngineChange) onEngineChange()
  }

  const handleKeySaved = (cred: CredentialMetadata) => {
    reload()
    showNotification(`API Key "${cred.name || cred.provider}" added successfully.`)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 2000)
    showNotification('Copied masked reference to clipboard.')
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
    showNotification('Code snippet copied to clipboard.')
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
      showNotification(`Credential "${res.credential.name || res.credential.provider}" rotated successfully.`)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Rotation failed')
    }
  }

  const handleRevoke = async (id: string) => {
    const target = credentials.find(c => c.id === id)
    await apiKeyService.revokeCredential(id)
    reload()
    showNotification(`Credential "${target?.name || target?.provider || 'Key'}" has been revoked.`)
  }

  const handleDelete = async (id: string) => {
    const target = credentials.find(c => c.id === id)
    const label = target?.name || (target ? `${target.provider} Key` : 'this credential')
    if (window.confirm(`Permanently remove "${label}" from your workspace?`)) {
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
    const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter
    const matchesProvider = providerFilter === 'all' ? true : item.provider === providerFilter
    const query = search.toLowerCase().trim()
    const matchesSearch =
      !query ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      item.provider.toLowerCase().includes(query) ||
      item.credentialType.toLowerCase().includes(query) ||
      item.maskedValue.toLowerCase().includes(query)
    return matchesStatus && matchesProvider && matchesSearch
  })

  // Dynamic statistics
  const totalKeys = credentials.length
  const activeKeys = credentials.filter(k => k.status === 'Active').length
  const revokedKeys = credentials.filter(k => k.status === 'Revoked').length
  const authScopesActive = credentials
    .filter(k => k.status === 'Active')
    .reduce((acc, k) => {
      k.permissions.forEach(p => acc.add(p))
      return acc
    }, new Set<string>()).size

  const getProviderIcon = (p: ApiKeyProvider | string) => {
    switch (p) {
      case 'Google Gemini':
        return <Zap size={13} style={{ color: '#64ffda' }} />
      case 'OpenAI':
        return <Code2 size={13} style={{ color: '#10a37f' }} />
      case 'NVIDIA':
        return <Sparkles size={13} style={{ color: '#76b900' }} />
      default:
        return <Shield size={13} style={{ color: 'var(--cyan)' }} />
    }
  }

  const getCurlCode = () => `curl -X POST https://api.projectpilot.ai/v1/agents/run \\
  -H "Authorization: Bearer ${credentials[0]?.maskedValue || 'AIza...7X9'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "Requirement Agent",
    "mode": "exhaustive_analysis",
    "context": { "projectId": "${project.id}" }
  }'`

  const getTsCode = () => `import { ProjectPilotClient } from '@projectpilot/sdk'

const client = new ProjectPilotClient({
  apiKey: process.env.PROJECTPILOT_API_KEY, // e.g. ${credentials[0]?.maskedValue || 'AIza...7X9'}
  projectId: '${project.id}'
})

// Trigger reviewer agent
const risks = await client.agents.reviewProject({
  includeUnresolvedOnly: true,
  severityThreshold: 'High'
})
console.log('Detected engineering gaps:', risks.length)`

  const getPythonCode = () => `from projectpilot import ProjectPilot

pilot = ProjectPilot(
    api_key="${credentials[0]?.maskedValue || 'AIza...7X9'}",
    project_id="${project.id}"
)

# Run full project architecture and execution validation
plan = pilot.agents.generate_plan()
print(f"Generated {len(plan.tasks)} milestones for {pilot.project.name}")`

  const currentSnippet = codeTab === 'curl' ? getCurlCode() : codeTab === 'ts' ? getTsCode() : getPythonCode()

  return (
    <div className="api-keys-page">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="header-title-group">
          <div className="eyebrow-badge">
            <Lock size={12} />
            WORKSPACE SECURITY & INTEGRATIONS
          </div>
          <h1>API Keys & Agent Tokens</h1>
          <p className="header-desc">
            Configure encrypted API keys for external agent runners, CI/CD automation, and
            connecting LLM reasoning engines to this workspace.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-create-key"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            Create New API Key
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Metrics Ribbon */}
      <div className="vault-kpi-ribbon">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-wrap">
              <Key size={18} />
            </div>
            <span className="kpi-badge badge-active-pulse">
              <span className="live-dot" />
              {activeKeys} ACTIVE
            </span>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalKeys}</span>
            <span className="kpi-label">Configured Keys</span>
            <span className="kpi-subtext">{revokedKeys} revoked / archived</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-wrap emerald">
              <Zap size={18} />
            </div>
            <span className="kpi-badge badge-secure">
              {engineStatus.mode === 'Live Connected' ? 'CONNECTED' : 'SIMULATED'}
            </span>
          </div>
          <div className="kpi-body">
            <span className="kpi-value" style={{ fontSize: '18px', letterSpacing: '-0.01em' }}>
              {engineStatus.providerName || 'Local Engine'}
            </span>
            <span className="kpi-label">Active Inference Engine</span>
            <span className="kpi-subtext">
              {engineStatus.mode === 'Live Connected' ? 'Live reasoning empowered' : 'Mock simulation fallback'}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-wrap cyan">
              <ShieldCheck size={18} />
            </div>
            <span className="kpi-badge badge-secure">AES-256 GCM</span>
          </div>
          <div className="kpi-body">
            <span className="kpi-value" style={{ fontSize: '20px', color: 'var(--cyan)' }}>Encrypted</span>
            <span className="kpi-label">Vault Storage Security</span>
            <span className="kpi-subtext">Zero plain-text logging in browser</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-wrap amber">
              <Terminal size={18} />
            </div>
            <span className="kpi-badge" style={{ background: 'rgba(255, 179, 0, 0.1)', color: 'var(--amber)', border: '1px solid rgba(255, 179, 0, 0.3)' }}>
              RBAC SCOPES
            </span>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{authScopesActive}</span>
            <span className="kpi-label">Active Permissions</span>
            <span className="kpi-subtext">Granted across active credentials</span>
          </div>
        </div>
      </div>

      {/* 3. High-Tech AI Engine & Verification Banner */}
      <div className="engine-banner-card">
        <div className="engine-info-wrap">
          <div className={`engine-avatar ${engineStatus.mode === 'Live Connected' ? '' : 'sim'}`}>
            <Zap size={24} />
          </div>
          <div className="engine-meta">
            <div className="engine-header-row">
              <span className={`engine-state-pill ${engineStatus.mode === 'Live Connected' ? 'live' : 'sim'}`}>
                <span className={engineStatus.mode === 'Live Connected' ? 'live-dot' : 'sim-dot'} />
                {engineStatus.mode.toUpperCase()}
              </span>
              <span className="provider-tag">{engineStatus.providerName}</span>
            </div>
            <p className="engine-desc-text">
              {engineStatus.mode === 'Live Connected' ? (
                <>
                  Agents for <b>{project.name}</b> are authenticated via active credential [
                  <b>{engineStatus.activeCredential?.name || 'Primary Key'}</b>]. Autonomous engineering
                  requests execute live reasoning models.
                </>
              ) : (
                <>
                  Currently operating in <b>Simulation Mode</b>. Connect your Google Gemini, OpenAI, or
                  NVIDIA API key to enable live autonomous execution.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="engine-test-box">
          <form onSubmit={handleTestConnection} className="test-input-group">
            <input
              type="text"
              placeholder="Paste token or key name to test..."
              value={quickTestKey}
              onChange={e => setQuickTestKey(e.target.value)}
              className="test-input"
            />
            <button type="submit" className="test-submit-btn">
              <Terminal size={13} />
              Verify
            </button>
          </form>

          {testResult && (
            <div className={`test-status-pill ${testResult.valid ? 'success' : 'failure'}`}>
              {testResult.valid ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Controls & Filters Toolbar */}
      <div className="vault-toolbar">
        <div className="vault-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search keys by name, provider, or token suffix..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="vault-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="vault-filter-pills">
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Keys ({totalKeys})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === 'Active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Active')}
          >
            Active ({activeKeys})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === 'Revoked' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Revoked')}
          >
            Revoked ({revokedKeys})
          </button>

          {/* Provider quick filters */}
          <button
            type="button"
            className={`filter-pill-btn ${providerFilter === 'Google Gemini' ? 'active' : ''}`}
            onClick={() => setProviderFilter(providerFilter === 'Google Gemini' ? 'all' : 'Google Gemini')}
          >
            Gemini
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${providerFilter === 'OpenAI' ? 'active' : ''}`}
            onClick={() => setProviderFilter(providerFilter === 'OpenAI' ? 'all' : 'OpenAI')}
          >
            OpenAI
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${providerFilter === 'NVIDIA' ? 'active' : ''}`}
            onClick={() => setProviderFilter(providerFilter === 'NVIDIA' ? 'all' : 'NVIDIA')}
          >
            NVIDIA
          </button>
        </div>
      </div>

      {/* 5. Credentials Table Matrix (Exact columns: KEY NAME, PROVIDER, DETAILS) */}
      <div className="vault-table-panel">
        <div className="table-panel-header">
          <div>
            <h2>Configured Keys & Access Credentials</h2>
            <span>Credentials authorized to interact with the {project.name} workspace</span>
          </div>
          <div className="vault-status-badge">
            <ShieldCheck size={14} />
            VAULT SECURED
          </div>
        </div>

        {filteredCredentials.length === 0 ? (
          <div className="vault-empty-state">
            <div className="empty-icon-wrap">
              <Key size={26} />
            </div>
            <h3>No credentials match your filter</h3>
            <p>Add your AI provider API key to configure reasoning agents for this workspace.</p>
            <button
              type="button"
              className="btn-create-key"
              onClick={() => setShowCreateModal(true)}
              style={{ marginTop: '8px' }}
            >
              <Plus size={15} /> Create New API Key
            </button>
          </div>
        ) : (
          <div className="vault-table">
            <div className="vault-table-head">
              <span>KEY NAME</span>
              <span>PROVIDER</span>
              <span style={{ textAlign: 'right' }}>DETAILS</span>
            </div>

            {filteredCredentials.map(item => (
              <div
                className={`vault-table-row ${item.status === 'Revoked' ? 'revoked' : ''}`}
                key={item.id}
              >
                {/* 1. KEY NAME COLUMN */}
                <div className="col-key-identity">
                  <div className="key-title-line">
                    <span className="key-display-name">{item.name || `${item.provider} Key`}</span>
                    <span
                      className={`cred-type-tag ${
                        item.credentialType === 'PLATFORM_TOKEN' ? 'platform' : 'provider'
                      }`}
                    >
                      {item.credentialType === 'PLATFORM_TOKEN' ? 'Platform Token' : 'Provider API Key'}
                    </span>
                    {item.status === 'Revoked' && (
                      <span className="cred-type-tag" style={{ background: 'rgba(255, 82, 82, 0.1)', color: 'var(--red)', borderColor: 'rgba(255, 82, 82, 0.3)' }}>
                        REVOKED
                      </span>
                    )}
                  </div>
                  <div className="token-chip-wrap">
                    <code className="token-masked-code">{item.maskedValue}</code>
                    <button
                      type="button"
                      className="token-copy-btn"
                      onClick={() => handleCopy(item.maskedValue, item.id)}
                      title="Copy masked reference"
                    >
                      {copiedKeyId === item.id ? <Check size={11} style={{ color: 'var(--lime)' }} /> : <Copy size={11} />}
                      <span>{copiedKeyId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. PROVIDER COLUMN */}
                <div className="col-provider">
                  <span
                    className={`provider-pill-badge ${
                      item.provider === 'Google Gemini'
                        ? 'gemini'
                        : item.provider === 'OpenAI'
                        ? 'openai'
                        : item.provider === 'NVIDIA'
                        ? 'nvidia'
                        : ''
                    }`}
                  >
                    {getProviderIcon(item.provider)}
                    {item.provider}
                  </span>
                </div>

                {/* 3. DETAILS COLUMN */}
                <div className="col-details">
                  <button
                    type="button"
                    className="btn-details-trigger"
                    onClick={() => {
                      setSelectedCredential(item)
                      setActiveModal('details')
                    }}
                    title="View Credential Details"
                  >
                    <Info size={13} />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. SDK & CLI Integration Guide */}
      <div className="code-integration-panel">
        <div className="code-panel-head">
          <div>
            <h2>SDK & CLI Integration Example</h2>
            <span>Authorize external engineering runners and autonomous pipelines</span>
          </div>
          <div className="code-tabs-row">
            <button
              type="button"
              className={`code-tab-btn ${codeTab === 'curl' ? 'active' : ''}`}
              onClick={() => setCodeTab('curl')}
            >
              cURL
            </button>
            <button
              type="button"
              className={`code-tab-btn ${codeTab === 'ts' ? 'active' : ''}`}
              onClick={() => setCodeTab('ts')}
            >
              TypeScript SDK
            </button>
            <button
              type="button"
              className={`code-tab-btn ${codeTab === 'python' ? 'active' : ''}`}
              onClick={() => setCodeTab('python')}
            >
              Python Client
            </button>
          </div>
        </div>

        <div className="code-editor-box">
          <button
            type="button"
            className="code-copy-float-btn"
            onClick={() => handleCopyCode(currentSnippet)}
          >
            {codeCopied ? <Check size={12} style={{ color: 'var(--lime)' }} /> : <Copy size={12} />}
            <span>{codeCopied ? 'Copied' : 'Copy Snippet'}</span>
          </button>
          <pre>
            <code>{currentSnippet}</code>
          </pre>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW API KEY                                               */}
      {/* ========================================================================= */}
      <CreateNewApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={handleKeySaved}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: CREDENTIAL DETAILS INSPECTOR                                     */}
      {/* ========================================================================= */}
      {activeModal === 'details' && selectedCredential && (
        <div className="modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="vault-details-modal" onClick={e => e.stopPropagation()}>
            <div className="vault-modal-header">
              <div>
                <span className="eyebrow-badge">
                  <Key size={11} />
                  CREDENTIAL METADATA
                </span>
                <h2>{selectedCredential.name || `${selectedCredential.provider} Key`}</h2>
              </div>
              <button
                type="button"
                className="close-modal-x"
                onClick={() => setActiveModal('none')}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="vault-modal-body">
              <div className="detail-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Credential Type</span>
                  <span className="meta-val">
                    {selectedCredential.credentialType === 'PLATFORM_TOKEN'
                      ? 'Platform Token'
                      : 'Provider API Key'}
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Provider</span>
                  <span className="meta-val" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getProviderIcon(selectedCredential.provider)}
                    {selectedCredential.provider}
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Vault Status</span>
                  <span className="meta-val">
                    <span
                      style={{
                        color: selectedCredential.status === 'Active' ? 'var(--lime)' : 'var(--red)',
                        fontWeight: 700,
                      }}
                    >
                      {selectedCredential.status.toUpperCase()}
                    </span>
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Environment</span>
                  <span className="meta-val">{selectedCredential.environment || 'Production'}</span>
                </div>

                <div className="meta-item full-width">
                  <span className="meta-label">Masked Token Reference</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <code style={{ fontFamily: 'var(--mono)', color: 'var(--lime)', fontSize: '12px' }}>
                      {selectedCredential.maskedValue}
                    </code>
                    <button
                      type="button"
                      className="token-copy-btn"
                      onClick={() => handleCopy(selectedCredential.maskedValue, selectedCredential.id)}
                    >
                      <Copy size={11} /> Copy
                    </button>
                  </div>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Created By</span>
                  <span className="meta-val">{selectedCredential.createdBy}</span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Created At</span>
                  <span className="meta-val">{new Date(selectedCredential.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Expiration</span>
                  <span className="meta-val">
                    {selectedCredential.expiresAt
                      ? new Date(selectedCredential.expiresAt).toLocaleDateString()
                      : 'Never Expires'}
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Last Used</span>
                  <span className="meta-val">{selectedCredential.lastUsedAt || 'Never used'}</span>
                </div>
              </div>

              <div>
                <span className="meta-label" style={{ display: 'block', marginBottom: '8px' }}>
                  Authorized Permissions & Scopes
                </span>
                <div className="scopes-chips-wrap">
                  {selectedCredential.permissions.map(s => (
                    <span className="scope-pill" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="vault-modal-footer">
              <div className="modal-left-actions">
                {selectedCredential.status === 'Active' ? (
                  <>
                    <button
                      type="button"
                      className="btn-action-rotate"
                      onClick={() => {
                        setRotateNewSecret('')
                        setFormError('')
                        setActiveModal('rotate')
                      }}
                    >
                      <RefreshCw size={12} /> Rotate Key
                    </button>
                    <button
                      type="button"
                      className="btn-action-danger"
                      onClick={() => {
                        handleRevoke(selectedCredential.id)
                        setActiveModal('none')
                      }}
                    >
                      <ShieldAlert size={12} /> Revoke Key
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-action-danger"
                    onClick={() => {
                      handleDelete(selectedCredential.id)
                      setActiveModal('none')
                    }}
                  >
                    <Trash2 size={12} /> Delete Key
                  </button>
                )}
              </div>

              <div className="modal-right-actions">
                <button
                  type="button"
                  className="btn-modal-close"
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
      {/* MODAL 3: ROTATE KEY MODAL                                                 */}
      {/* ========================================================================= */}
      {activeModal === 'rotate' && selectedCredential && (
        <div className="modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="vault-details-modal" onClick={e => e.stopPropagation()}>
            <div className="vault-modal-header">
              <div>
                <span className="eyebrow-badge">
                  <RefreshCw size={11} />
                  CREDENTIAL ROTATION
                </span>
                <h2>Rotate {selectedCredential.name || `${selectedCredential.provider} Key`}</h2>
              </div>
              <button
                type="button"
                className="close-modal-x"
                onClick={() => setActiveModal('none')}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRotate} className="modal-form" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
                {selectedCredential.credentialType === 'PLATFORM_TOKEN'
                  ? 'Rotating this platform token will generate a new secure secret and immediately invalidate the current one.'
                  : 'Enter the new API secret key from your provider to update this credential in your secure vault.'}
              </p>

              {selectedCredential.credentialType === 'PROVIDER_API_KEY' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  New Provider API Key Secret
                  <div className="manual-input-wrap">
                    <input
                      required
                      type={showRotateSecretText ? 'text' : 'password'}
                      placeholder="Paste new secret key..."
                      value={rotateNewSecret}
                      onChange={e => setRotateNewSecret(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        background: '#09131a',
                        border: '1px solid rgba(44, 73, 67, 0.7)',
                        borderRadius: '5px',
                        padding: '10px 42px 10px 12px',
                        color: 'var(--text)',
                        fontFamily: 'var(--mono)',
                        fontSize: '12px',
                      }}
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

              {formError && (
                <div className="form-error-banner" style={{ background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.3)', padding: '10px 14px', borderRadius: '5px', color: 'var(--red)', fontSize: '12px' }}>
                  <AlertTriangle size={14} />
                  {formError}
                </div>
              )}

              <div className="vault-modal-footer" style={{ margin: '8px -24px -24px', padding: '16px 24px' }}>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setActiveModal('none')}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-create-key">
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
