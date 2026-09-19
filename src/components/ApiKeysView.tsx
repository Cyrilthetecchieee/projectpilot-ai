import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Info,
  Key,
  KeyRound,
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
  ApiKeyEnvironment,
  ApiKeyProvider,
  ApiKeyScope,
  CredentialMetadata,
  CredentialType,
  Project,
} from '../types'

interface ApiKeysViewProps {
  project: Project
  onEngineChange?: () => void
}

const AVAILABLE_SCOPES: { id: ApiKeyScope; label: string; desc: string }[] = [
  { id: 'run:agents', label: 'Execute Agents', desc: 'Run configured agents and workflows.' },
  { id: 'read:project', label: 'Read Project', desc: 'Read project requirements, architecture, tasks and tests.' },
  { id: 'write:project', label: 'Write Project', desc: 'Create or update project data.' },
  { id: 'manage:keys', label: 'Manage Keys', desc: 'Create, configure and revoke project credentials.' },
  { id: 'admin', label: 'Full Admin Access', desc: 'Unrestricted administrative access.' },
]

export function ApiKeysView({ project, onEngineChange }: ApiKeysViewProps) {
  const [credentials, setCredentials] = useState<CredentialMetadata[]>(() =>
    apiKeyService.getCredentialsSync()
  )
  const [engineStatus, setEngineStatus] = useState(() => apiKeyService.getAiEngineStatus())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'Active' | 'Revoked'>('all')
  const [toast, setToast] = useState('')

  // Dropdown button state
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Active modal state
  const [activeModal, setActiveModal] = useState<
    'none' | 'platform_token' | 'provider_key' | 'token_result' | 'details' | 'rotate'
  >('none')

  // Form states for modals
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<ApiKeyProvider>('Google Gemini')
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>('Production')
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    'run:agents',
    'read:project',
    'write:project',
  ])
  const [customSecret, setCustomSecret] = useState('')
  const [showSecretText, setShowSecretText] = useState(false)
  const [expiryDays, setExpiryDays] = useState<number | null>(90)
  const [formError, setFormError] = useState('')

  // Success state for newly generated platform token
  const [generatedResult, setGeneratedResult] = useState<{
    token: string
    name: string
    credentialType: CredentialType
  } | null>(null)
  const [copiedGeneratedToken, setCopiedGeneratedToken] = useState(false)

  // Details & Rotate modal targets
  const [selectedCredential, setSelectedCredential] = useState<CredentialMetadata | null>(null)
  const [rotateNewSecret, setRotateNewSecret] = useState('')
  const [showRotateSecretText, setShowRotateSecretText] = useState(false)

  // Row copy feedback
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Connection testing & code snippet
  const [quickTestKey, setQuickTestKey] = useState('')
  const [testResult, setTestResult] = useState<{ message: string; valid: boolean } | null>(null)
  const [codeTab, setCodeTab] = useState<'curl' | 'ts' | 'python'>('curl')

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCreateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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

  const handleCopy = (text: string, id?: string) => {
    navigator.clipboard.writeText(text)
    if (id) {
      setCopiedKeyId(id)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } else {
      setCopiedGeneratedToken(true)
      setTimeout(() => setCopiedGeneratedToken(false), 2000)
    }
    showNotification('Copied to clipboard.')
  }

  const handleDownloadToken = (token: string, tokenName: string) => {
    const content = `# ProjectPilot API Credential
# Workspace: ${project.name}
# Description: ${tokenName}
# Generated: ${new Date().toISOString()}
PROJECTPILOT_API_TOKEN=${token}
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `projectpilot-token-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showNotification('Token downloaded securely.')
  }

  // Open "Generate Platform Token" modal
  const openPlatformTokenModal = () => {
    setShowCreateDropdown(false)
    setName('')
    setProvider('Google Gemini')
    setEnvironment('Production')
    // Default: Execute Agents, Read Project, Write Project. Full Admin Access is NOT checked by default.
    setSelectedScopes(['run:agents', 'read:project', 'write:project'])
    setExpiryDays(90)
    setFormError('')
    setActiveModal('platform_token')
  }

  // Open "Add Provider API Key" modal
  const openProviderKeyModal = () => {
    setShowCreateDropdown(false)
    setName('')
    setProvider('Google Gemini')
    setEnvironment('Production')
    setCustomSecret('')
    setShowSecretText(false)
    setSelectedScopes(['run:agents', 'read:project', 'write:project'])
    setExpiryDays(90)
    setFormError('')
    setActiveModal('provider_key')
  }

  const toggleScope = (scopeId: ApiKeyScope) => {
    if (scopeId === 'admin') {
      if (selectedScopes.includes('admin')) {
        setSelectedScopes(['run:agents', 'read:project', 'write:project'])
      } else {
        setSelectedScopes(['admin', 'run:agents', 'read:project', 'write:project', 'manage:keys'])
      }
      return
    }

    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scopeId && s !== 'admin'))
    } else {
      setSelectedScopes([...selectedScopes, scopeId])
    }
  }

  // Submit Generate Platform Token
  const handleGeneratePlatformToken = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    try {
      const { credential, rawToken } = await apiKeyService.generatePlatformToken({
        name: name.trim() || 'Workspace Platform Token',
        provider,
        environment,
        permissions: selectedScopes,
        expiresInDays: expiryDays,
      })

      reload()
      setGeneratedResult({
        token: rawToken,
        name: credential.name,
        credentialType: 'PLATFORM_TOKEN',
      })
      setActiveModal('token_result')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to generate token')
    }
  }

  // Submit Add Provider API Key
  const handleAddProviderKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!customSecret.trim()) {
      setFormError('API Secret Key is required.')
      return
    }

    try {
      const cred = await apiKeyService.addProviderKey({
        name: name.trim() || `${provider} Key`,
        provider,
        secretKey: customSecret.trim(),
        environment,
        permissions: selectedScopes,
        expiresInDays: expiryDays,
      })

      reload()
      setActiveModal('none')
      showNotification(`Provider API Key "${cred.name}" saved securely.`)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save provider key')
    }
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
      if (res.rawToken) {
        setGeneratedResult({
          token: res.rawToken,
          name: res.credential.name,
          credentialType: 'PLATFORM_TOKEN',
        })
        setActiveModal('token_result')
      } else {
        setActiveModal('none')
        showNotification(`Credential "${res.credential.name}" rotated successfully.`)
      }
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

        {/* Top actions: Single primary dropdown button */}
        <div className="header-actions">
          <div className="create-key-dropdown-wrap" ref={dropdownRef}>
            <button
              type="button"
              className="btn"
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              aria-expanded={showCreateDropdown}
            >
              <Plus size={16} />
              Create New API Key
              <ChevronDown size={14} />
            </button>

            {showCreateDropdown && (
              <div className="create-key-menu" role="menu">
                <button
                  type="button"
                  className="create-key-menu-item"
                  onClick={openPlatformTokenModal}
                  role="menuitem"
                >
                  <Sparkles size={16} />
                  <div>
                    <strong>Generate Platform Token</strong>
                    <span>Create a secure workspace authentication token</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="create-key-menu-item"
                  onClick={openProviderKeyModal}
                  role="menuitem"
                >
                  <KeyRound size={16} />
                  <div>
                    <strong>Add Provider API Key</strong>
                    <span>Connect existing Google Gemini, OpenAI, or NVIDIA key</span>
                  </div>
                </button>
              </div>
            )}
          </div>
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
            <p>Generate a platform token or add your AI provider API key to get started.</p>
            <button
              type="button"
              className="btn"
              onClick={openPlatformTokenModal}
            >
              <Plus size={15} /> Generate Platform Token
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
  -H "Authorization: Bearer ${credentials[0]?.maskedValue || 'axr_live_...'}" \\
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
  apiKey: process.env.PROJECTPILOT_API_KEY, // e.g. ${credentials[0]?.maskedValue || 'axr_live_...'}
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
    api_key="${credentials[0]?.maskedValue || 'axr_live_...'}",
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
      {/* 1. GENERATE PLATFORM TOKEN MODAL                                         */}
      {/* ========================================================================= */}
      {activeModal === 'platform_token' && (
        <div className="modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">PLATFORM CREDENTIAL</span>
                <h2>Generate New API Token</h2>
                <p style={{ color: 'var(--muted)', fontSize: '11.5px', marginTop: '4px' }}>
                  Create a secure platform token for authenticating requests to this workspace.
                </p>
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

            <form onSubmit={handleGeneratePlatformToken} className="modal-form">
              <label>
                Key Name / Description
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Helmet Agent Token, CI/CD Runner"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </label>

              <div className="form-grid">
                <label>
                  Provider / Model Architecture
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as ApiKeyProvider)}
                  >
                    <option value="Google Gemini">Google Gemini</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="NVIDIA">NVIDIA</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Deployment Environment
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value as ApiKeyEnvironment)}
                  >
                    <option value="Development">Development</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </label>
              </div>

              <label>
                Permissions & Access Scopes
                <div className="scopes-grid">
                  {AVAILABLE_SCOPES.map(scope => {
                    const active = selectedScopes.includes(scope.id)
                    return (
                      <div
                        key={scope.id}
                        className={`scope-selector-card ${active ? 'scope-selected' : ''}`}
                        onClick={() => toggleScope(scope.id)}
                      >
                        <div className="scope-card-top">
                          <span className={`scope-checkbox ${active ? 'checked' : ''}`}>
                            {active && <Check size={12} />}
                          </span>
                          <b>{scope.label}</b>
                        </div>
                        <p>{scope.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </label>

              <label>
                Key Expiration
                <select
                  value={expiryDays === null ? 'never' : String(expiryDays)}
                  onChange={e =>
                    setExpiryDays(e.target.value === 'never' ? null : Number(e.target.value))
                  }
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days (Default)</option>
                  <option value="365">1 Year</option>
                  <option value="never">Never Expire</option>
                </select>
              </label>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveModal('none')}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  <Key size={15} /> Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD PROVIDER API KEY MODAL                                            */}
      {/* ========================================================================= */}
      {activeModal === 'provider_key' && (
        <div className="modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">PROVIDER INTEGRATION</span>
                <h2>Add Provider API Key</h2>
                <p style={{ color: 'var(--muted)', fontSize: '11.5px', marginTop: '4px' }}>
                  Connect an existing API key from your AI provider.
                </p>
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

            <form onSubmit={handleAddProviderKey} className="modal-form">
              {/* Informational Message */}
              <div className="informational-notice">
                <Info size={16} />
                <span>
                  This is an API key provided by your AI provider. It is different from a
                  platform-generated API token.
                </span>
              </div>

              <div className="form-grid">
                <label>
                  Provider
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as ApiKeyProvider)}
                  >
                    <option value="Google Gemini">Google Gemini</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="NVIDIA">NVIDIA</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Deployment Environment
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value as ApiKeyEnvironment)}
                  >
                    <option value="Development">Development</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </label>
              </div>

              <label>
                API Secret Key / Token (Required)
                <div className="manual-input-wrap">
                  <input
                    required
                    type={showSecretText ? 'text' : 'password'}
                    placeholder={
                      provider === 'Google Gemini'
                        ? 'Enter your Gemini API key (e.g. AIzaSy...)'
                        : provider === 'OpenAI'
                        ? 'Enter your OpenAI key (e.g. sk-proj-...)'
                        : provider === 'NVIDIA'
                        ? 'Enter your NVIDIA NGC / Nemotron API key...'
                        : 'Enter your AI provider API key...'
                    }
                    value={customSecret}
                    onChange={e => setCustomSecret(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowSecretText(!showSecretText)}
                    aria-label={showSecretText ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecretText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label>
                Key Name / Description
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${provider} Production Key`}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>

              <label>
                Permissions & Access Scopes
                <div className="scopes-grid">
                  {AVAILABLE_SCOPES.map(scope => {
                    const active = selectedScopes.includes(scope.id)
                    return (
                      <div
                        key={scope.id}
                        className={`scope-selector-card ${active ? 'scope-selected' : ''}`}
                        onClick={() => toggleScope(scope.id)}
                      >
                        <div className="scope-card-top">
                          <span className={`scope-checkbox ${active ? 'checked' : ''}`}>
                            {active && <Check size={12} />}
                          </span>
                          <b>{scope.label}</b>
                        </div>
                        <p>{scope.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </label>

              <label>
                Key Expiration
                <select
                  value={expiryDays === null ? 'never' : String(expiryDays)}
                  onChange={e =>
                    setExpiryDays(e.target.value === 'never' ? null : Number(e.target.value))
                  }
                >
                  <option value="90">90 Days (Default)</option>
                  <option value="30">30 Days</option>
                  <option value="365">1 Year</option>
                  <option value="never">Never Expire</option>
                </select>
              </label>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveModal('none')}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  <ShieldCheck size={15} /> Save Provider Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GENERATED TOKEN RESULT (SUCCESS STATE)                                */}
      {/* ========================================================================= */}
      {activeModal === 'token_result' && generatedResult && (
        <div className="modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="modal-window reveal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">
                  <ShieldCheck size={13} /> PLATFORM AUTHENTICATION
                </span>
                <h2>API Token Generated</h2>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => {
                  setGeneratedResult(null)
                  setActiveModal('none')
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="reveal-body">
              <div className="security-alert-box">
                <AlertTriangle size={20} />
                <div>
                  <strong>Save this token securely. You may not be able to view it again.</strong>
                  <p style={{ marginTop: '4px' }}>
                    Copy or download this token now. After closing this dialog, it will never be displayed in full again.
                  </p>
                </div>
              </div>

              <div className="secret-display-box">
                <span className="key-tag-name">{generatedResult.name}</span>
                <div className="secret-input-row">
                  <code className="secret-code">{generatedResult.token}</code>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleCopy(generatedResult.token)}
                >
                  {copiedGeneratedToken ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedGeneratedToken ? 'Copied!' : 'Copy Token'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    handleDownloadToken(generatedResult.token, generatedResult.name)
                  }
                >
                  <Download size={14} />
                  <span>Download Token</span>
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setGeneratedResult(null)
                    setActiveModal('none')
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW DETAILS MODAL                                                    */}
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
      {/* 5. ROTATE CREDENTIAL MODAL                                               */}
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

              {formError && <div className="form-error">{formError}</div>}

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
