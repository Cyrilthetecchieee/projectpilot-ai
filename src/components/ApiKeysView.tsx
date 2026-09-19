import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Key,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { apiKeyService } from '../services/apiKeyService'
import type {
  ApiKey,
  ApiKeyEnvironment,
  ApiKeyProvider,
  ApiKeyScope,
  CreateApiKeyPayload,
  Project,
} from '../types'

interface ApiKeysViewProps {
  project: Project
  onEngineChange?: () => void
}

const AVAILABLE_SCOPES: { id: ApiKeyScope; label: string; desc: string }[] = [
  { id: 'read:project', label: 'Read Project', desc: 'Read requirements, architecture, tasks, and tests' },
  { id: 'write:project', label: 'Write Project', desc: 'Create and update requirements, architecture nodes, tasks' },
  { id: 'run:agents', label: 'Execute Agents', desc: 'Run Requirement, Architecture, Reviewer, and Test agents' },
  { id: 'manage:keys', label: 'Manage Keys', desc: 'Generate and revoke project API keys' },
  { id: 'admin', label: 'Full Admin Access', desc: 'Unrestricted administration over project and agents' },
]

export function ApiKeysView({ project, onEngineChange }: ApiKeysViewProps) {
  const [keys, setKeys] = useState<ApiKey[]>(() => apiKeyService.getApiKeys())
  const [engineStatus, setEngineStatus] = useState(() => apiKeyService.getAiEngineStatus())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'Active' | 'Revoked'>('all')

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [revealedKey, setRevealedKey] = useState<{ name: string; secret: string } | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [testResult, setTestResult] = useState<{ message: string; valid: boolean } | null>(null)
  const [quickTestKey, setQuickTestKey] = useState('')
  const [codeTab, setCodeTab] = useState<'curl' | 'ts' | 'python'>('curl')

  // Form state
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<ApiKeyProvider>('ProjectPilot')
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>('Production')
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    'read:project',
    'write:project',
    'run:agents',
  ])
  const [customSecret, setCustomSecret] = useState('')
  const [expiryDays, setExpiryDays] = useState<number | null>(90)

  const reload = () => {
    const updated = apiKeyService.getApiKeys()
    setKeys(updated)
    setEngineStatus(apiKeyService.getAiEngineStatus())
    if (onEngineChange) onEngineChange()
  }

  const handleCopy = (text: string, keyId?: string) => {
    navigator.clipboard.writeText(text)
    if (keyId) {
      setCopiedKeyId(keyId)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } else {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateApiKeyPayload = {
      name: name.trim() || 'New Agent Key',
      provider,
      environment,
      scopes: selectedScopes,
      secretKey: customSecret.trim() ? customSecret.trim() : undefined,
      expiresInDays: expiryDays,
    }

    const { apiKey, rawSecret } = apiKeyService.createApiKey(payload)
    reload()
    setShowCreateModal(false)
    setName('')
    setCustomSecret('')
    setSelectedScopes(['read:project', 'write:project', 'run:agents'])
    setRevealedKey({ name: apiKey.name, secret: rawSecret })
  }

  const handleRevoke = (id: string) => {
    apiKeyService.revokeApiKey(id)
    reload()
  }

  const handleRestore = (id: string) => {
    apiKeyService.restoreApiKey(id)
    reload()
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this API key?')) {
      apiKeyService.deleteApiKey(id)
      reload()
    }
  }

  const handleResetDefaults = () => {
    if (confirm('Reset API keys to factory defaults?')) {
      apiKeyService.resetDemoKeys()
      reload()
    }
  }

  const handleTestKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTestKey.trim()) return
    const res = apiKeyService.validateApiKey(quickTestKey)
    setTestResult(res)
    reload()
  }

  const toggleScope = (scope: ApiKeyScope) => {
    if (scope === 'admin') {
      if (selectedScopes.includes('admin')) {
        setSelectedScopes(['read:project'])
      } else {
        setSelectedScopes(['admin', 'read:project', 'write:project', 'run:agents', 'manage:keys'])
      }
      return
    }

    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope && s !== 'admin'))
    } else {
      setSelectedScopes([...selectedScopes, scope])
    }
  }

  const filteredKeys = keys.filter(k => {
    const matchesFilter = filter === 'all' ? true : k.status === filter
    const matchesSearch =
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.provider.toLowerCase().includes(search.toLowerCase()) ||
      k.maskedKey.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="api-keys-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">WORKSPACE SECURITY & INTEGRATIONS</span>
          <h1>API Keys & Agent Tokens</h1>
          <p>
            Create, configure and manage API keys for external agent runners, CI/CD automation, and
            connecting LLM reasoning models.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetDefaults}
            title="Reset to sample keys"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>
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

      {/* Engine Status Banner */}
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
                ? `Agents for "${project.name}" are authenticated via active key [${engineStatus.activeKey?.name || 'Primary Token'}]. Requests will invoke live reasoning models.`
                : `Currently in Mock Mode. Connect an active Google Gemini, OpenAI, or ProjectPilot API Key with "run:agents" permission to unlock live model inference.`}
            </p>
          </div>
        </div>
        <div className="engine-banner-right">
          <form onSubmit={handleTestKey} className="quick-verify-form">
            <input
              type="text"
              placeholder="Paste token to test & authenticate..."
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

      {/* Metrics Strip */}
      <div className="metrics-strip">
        <span>
          <b>{keys.length}</b> Total API Keys
        </span>
        <span>
          <b>{keys.filter(k => k.status === 'Active').length}</b> Active Keys
        </span>
        <span>
          <b>{keys.filter(k => k.status === 'Revoked').length}</b> Revoked
        </span>
        <span>
          <b>{engineStatus.totalActiveKeys}</b> Auth Scopes Active
        </span>
      </div>

      {/* Search and Filters */}
      <div className="keys-toolbar">
        <div className="keys-search">
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
            All Keys ({keys.length})
          </button>
          <button
            type="button"
            className={filter === 'Active' ? 'selected' : ''}
            onClick={() => setFilter('Active')}
          >
            Active ({keys.filter(k => k.status === 'Active').length})
          </button>
          <button
            type="button"
            className={filter === 'Revoked' ? 'selected' : ''}
            onClick={() => setFilter('Revoked')}
          >
            Revoked ({keys.filter(k => k.status === 'Revoked').length})
          </button>
        </div>
      </div>

      {/* Keys Table */}
      <div className="panel table-panel keys-table-panel">
        <div className="table-heading">
          <div>
            <h2>Configured Keys & Access Credentials</h2>
            <span>Tokens authorized to interact with the {project.name} workspace</span>
          </div>
          <span className="badge badge-lime">VAULT SECURED</span>
        </div>

        {filteredKeys.length === 0 ? (
          <div className="empty-state">
            <Key size={32} />
            <h3>No API keys match your criteria</h3>
            <p>Generate a new API key to automate agents or authenticate external tools.</p>
            <button
              type="button"
              className="btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={15} /> Create API Key
            </button>
          </div>
        ) : (
          <div className="keys-table">
            <div className="keys-table-header">
              <span>KEY NAME & TOKEN</span>
              <span>PROVIDER</span>
              <span>ENV</span>
              <span>SCOPES</span>
              <span>LAST USED</span>
              <span className="actions-header">ACTIONS</span>
            </div>

            {filteredKeys.map(apiKey => (
              <div
                className={`keys-table-row ${apiKey.status === 'Revoked' ? 'row-revoked' : ''}`}
                key={apiKey.id}
              >
                <div className="key-identity">
                  <div className="key-title-row">
                    <span className="key-name">{apiKey.name}</span>
                    <span
                      className={`badge ${apiKey.status === 'Active' ? 'badge-lime' : 'badge-critical'}`}
                    >
                      {apiKey.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="token-preview">
                    <code>{apiKey.maskedKey}</code>
                    <button
                      type="button"
                      className="copy-mini-btn"
                      onClick={() => handleCopy(apiKey.key, apiKey.id)}
                      title="Copy full secret"
                    >
                      {copiedKeyId === apiKey.id ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedKeyId === apiKey.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="provider-pill">
                    {apiKey.provider === 'Google Gemini' && <Zap size={13} />}
                    {apiKey.provider === 'ProjectPilot' && <Shield size={13} />}
                    {apiKey.provider === 'OpenAI' && <Code2 size={13} />}
                    {apiKey.provider === 'Anthropic Claude' && <Terminal size={13} />}
                    {apiKey.provider}
                  </span>
                </div>

                <div>
                  <span
                    className={`env-badge env-${apiKey.environment.toLowerCase()}`}
                  >
                    {apiKey.environment}
                  </span>
                </div>

                <div className="scopes-list">
                  {apiKey.scopes.map(s => (
                    <span className="scope-tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>

                <div className="key-meta">
                  <span className="last-used">
                    {apiKey.lastUsedAt ? apiKey.lastUsedAt : 'Never used'}
                  </span>
                  <small className="created-date">
                    Created {new Date(apiKey.createdAt).toLocaleDateString()}
                  </small>
                </div>

                <div className="key-actions">
                  {apiKey.status === 'Active' ? (
                    <button
                      type="button"
                      className="icon-action-btn revoke-btn"
                      onClick={() => handleRevoke(apiKey.id)}
                      title="Revoke key"
                    >
                      <ShieldAlert size={15} />
                      <span>Revoke</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="icon-action-btn restore-btn"
                      onClick={() => handleRestore(apiKey.id)}
                      title="Reactivate key"
                    >
                      <RefreshCw size={15} />
                      <span>Restore</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-action-btn delete-btn"
                    onClick={() => handleDelete(apiKey.id)}
                    title="Delete key"
                  >
                    <Trash2 size={15} />
                  </button>
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
            <span>Authorize your engineering pipelines with ProjectPilot API keys</span>
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
              TypeScript / Node
            </button>
            <button
              type="button"
              className={codeTab === 'python' ? 'active-tab' : ''}
              onClick={() => setCodeTab('python')}
            >
              Python
            </button>
          </div>
        </div>

        <div className="code-snippet-box">
          {codeTab === 'curl' && (
            <pre>
              <code>{`# Execute Requirements Analysis Agent via ProjectPilot API
curl -X POST https://api.projectpilot.ai/v1/projects/${project.id}/agents/run \\
  -H "Authorization: Bearer ${keys[0]?.maskedKey || 'pp_live_••••••••••••'}" \\
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
  apiKey: process.env.PROJECTPILOT_API_KEY, // e.g. ${keys[0]?.maskedKey || 'pp_live_...'}
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
    api_key="${keys[0]?.maskedKey || 'pp_live_...'}",
    project_id="${project.id}"
)

# Run full project architecture and execution validation
plan = pilot.agents.generate_plan()
print(f"Generated {len(plan.tasks)} milestones for {pilot.project.name}")`}</code>
            </pre>
          )}
        </div>
      </div>

      {/* CREATE KEY MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">NEW CREDENTIAL</span>
                <h2>Generate New API Key</h2>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="modal-form">
              <label>
                Key Description / Identifier
                <input
                  type="text"
                  required
                  placeholder="e.g. GitHub Actions CI/CD Agent, Gemini 2.5 Provider"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label>
                  Provider / Model Architecture
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as ApiKeyProvider)}
                  >
                    <option value="ProjectPilot">ProjectPilot Native Token</option>
                    <option value="Google Gemini">Google Gemini (AI Engine)</option>
                    <option value="OpenAI">OpenAI GPT-4o / Reasoning</option>
                    <option value="Anthropic Claude">Anthropic Claude 3.7</option>
                    <option value="Custom">Custom Agent Webhook</option>
                  </select>
                </label>

                <label>
                  Deployment Environment
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value as ApiKeyEnvironment)}
                  >
                    <option value="Production">Production (Live)</option>
                    <option value="Staging">Staging (Pre-release)</option>
                    <option value="Development">Development (Local sandbox)</option>
                  </select>
                </label>
              </div>

              {provider !== 'ProjectPilot' && (
                <label>
                  Custom Secret Token (Optional)
                  <input
                    type="password"
                    placeholder={`Enter your ${provider} secret (leave blank to auto-generate)`}
                    value={customSecret}
                    onChange={e => setCustomSecret(e.target.value)}
                  />
                  <small className="field-hint">
                    Leave blank to generate an authenticated synthetic key for simulation and testing.
                  </small>
                </label>
              )}

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
                  <option value="60">60 Days</option>
                  <option value="90">90 Days (Recommended)</option>
                  <option value="365">1 Year</option>
                  <option value="never">Never Expire</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  <Key size={15} /> Generate API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME SECRET REVEAL MODAL */}
      {revealedKey && (
        <div className="modal-backdrop">
          <div className="modal-window reveal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <span className="eyebrow">
                  <ShieldCheck size={13} /> ONE-TIME KEY REVELATION
                </span>
                <h2>Save Your New API Key</h2>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setRevealedKey(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="reveal-body">
              <div className="security-alert-box">
                <AlertTriangle size={20} />
                <div>
                  <strong>Important Security Notice</strong>
                  <p>
                    Please copy and store this API key safely in your secrets vault or <code>.env</code> file.
                    For security purposes, you will not be able to view this full secret again.
                  </p>
                </div>
              </div>

              <div className="secret-display-box">
                <span className="key-tag-name">{revealedKey.name}</span>
                <div className="secret-input-row">
                  <code className="secret-code">{revealedKey.secret}</code>
                  <button
                    type="button"
                    className="btn copy-secret-btn"
                    onClick={() => handleCopy(revealedKey.secret)}
                  >
                    {copiedSecret ? <Check size={15} /> : <Copy size={15} />}
                    {copiedSecret ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>
              </div>

              <div className="reveal-footer">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setRevealedKey(null)}
                >
                  I have safely saved this key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
