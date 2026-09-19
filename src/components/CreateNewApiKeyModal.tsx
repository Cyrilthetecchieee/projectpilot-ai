import React, { useState } from 'react'
import {
  AlertCircle,
  Check,
  Code2,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { apiKeyService } from '../services/apiKeyService'
import type {
  ApiKeyEnvironment,
  ApiKeyProvider,
  ApiKeyScope,
  CredentialMetadata,
} from '../types'

interface CreateNewApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (credential: CredentialMetadata) => void
}

interface ScopeOption {
  id: ApiKeyScope
  label: string
  desc: string
}

const AVAILABLE_SCOPES: ScopeOption[] = [
  {
    id: 'run:agents',
    label: 'Execute Agents',
    desc: 'Run configured agents and workflows.',
  },
  {
    id: 'read:project',
    label: 'Read Project',
    desc: 'Read project requirements, architecture, tasks and tests.',
  },
  {
    id: 'write:project',
    label: 'Write Project',
    desc: 'Create or update project data.',
  },
  {
    id: 'manage:keys',
    label: 'Manage Keys',
    desc: 'Create, configure and revoke credentials.',
  },
  {
    id: 'admin',
    label: 'Full Admin Access',
    desc: 'Unrestricted administrative access.',
  },
]

function CreateNewApiKeyModalContent({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (credential: CredentialMetadata) => void
}) {
  const [provider, setProvider] = useState<ApiKeyProvider>('Google Gemini')
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>('Production')
  const [secretKey, setSecretKey] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [name, setName] = useState('Axiora Gemini Production')
  const [nameTouched, setNameTouched] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    'run:agents',
    'read:project',
    'write:project',
  ])
  const [expiryDays, setExpiryDays] = useState<number | null>(90)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedCredential, setSavedCredential] = useState<CredentialMetadata | null>(null)

  const handleProviderChange = (newP: ApiKeyProvider) => {
    setProvider(newP)
    if (!nameTouched) {
      const pLabel = newP === 'Google Gemini' ? 'Gemini' : newP
      setName(`Axiora ${pLabel} ${environment}`)
    }
    if (formError) setFormError('')
  }

  const handleEnvironmentChange = (newEnv: ApiKeyEnvironment) => {
    setEnvironment(newEnv)
    if (!nameTouched) {
      const pLabel = provider === 'Google Gemini' ? 'Gemini' : provider
      setName(`Axiora ${pLabel} ${newEnv}`)
    }
  }

  const getPlaceholderForProvider = (p: ApiKeyProvider): string => {
    switch (p) {
      case 'Google Gemini':
        return 'Paste your Gemini API key (e.g. AIzaSy...)'
      case 'OpenAI':
        return 'Paste your OpenAI API key'
      case 'NVIDIA':
        return 'Paste your NVIDIA API key'
      case 'Other':
      default:
        return 'Paste your provider API key'
    }
  }

  const getProviderIcon = (p: ApiKeyProvider) => {
    switch (p) {
      case 'Google Gemini':
        return <Zap size={14} className="provider-icon-gemini" />
      case 'OpenAI':
        return <Code2 size={14} className="provider-icon-openai" />
      case 'NVIDIA':
        return <Sparkles size={14} className="provider-icon-nvidia" />
      case 'Other':
      default:
        return <Shield size={14} className="provider-icon-other" />
    }
  }

  const toggleScope = (scopeId: ApiKeyScope) => {
    if (scopeId === 'admin') {
      if (selectedScopes.includes('admin')) {
        setSelectedScopes(['run:agents', 'read:project', 'write:project'])
      } else {
        setSelectedScopes([
          'admin',
          'run:agents',
          'read:project',
          'write:project',
          'manage:keys',
        ])
      }
      return
    }

    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scopeId && s !== 'admin'))
    } else {
      setSelectedScopes([...selectedScopes, scopeId])
    }
  }

  const validateSecret = (): string | null => {
    const trimmedSecret = secretKey.trim()
    if (!trimmedSecret) {
      return 'API key is required.'
    }
    if (!provider) {
      return 'Provider is required.'
    }
    if (!name.trim()) {
      return 'Key name is required.'
    }

    // Provider-specific format checks
    if (provider === 'Google Gemini') {
      if (trimmedSecret.length < 15 || (!trimmedSecret.startsWith('AIza') && trimmedSecret.length < 20)) {
        return 'Invalid API key format.'
      }
    } else if (provider === 'OpenAI') {
      if (!trimmedSecret.startsWith('sk-') || trimmedSecret.length < 15) {
        return 'Invalid API key format.'
      }
    } else if (provider === 'NVIDIA') {
      if (trimmedSecret.length < 10) {
        return 'Invalid API key format.'
      }
    } else {
      if (trimmedSecret.length < 8) {
        return 'Invalid API key format.'
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const validationMsg = validateSecret()
    if (validationMsg) {
      setFormError(validationMsg)
      return
    }

    setIsSubmitting(true)
    try {
      const created = await apiKeyService.addProviderKey({
        name: name.trim(),
        provider,
        secretKey: secretKey.trim(),
        environment,
        permissions: selectedScopes,
        expiresInDays: expiryDays,
      })

      setSavedCredential(created)
    } catch {
      setFormError('Unable to save API key. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDone = () => {
    if (savedCredential) {
      onSaved(savedCredential)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window create-key-modal-window" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-text">
            <span className="eyebrow">
              {savedCredential ? (
                <>
                  <ShieldCheck size={13} style={{ color: 'var(--lime)' }} /> CREDENTIAL STORED
                </>
              ) : (
                <>
                  <KeyRound size={13} style={{ color: 'var(--cyan)' }} /> WORKSPACE CREDENTIAL
                </>
              )}
            </span>
            <h2>{savedCredential ? 'API Key Added Successfully' : 'Create New API Key'}</h2>
            <p style={{ color: 'var(--muted)', fontSize: '11.5px', marginTop: '4px' }}>
              {savedCredential
                ? 'Your API key has been securely added to this workspace.'
                : 'Add an existing API key or credential from your AI provider.'}
            </p>
          </div>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Success State or Creation Form */}
        {savedCredential ? (
          <div className="reveal-body" style={{ padding: '24px' }}>
            <div
              className="security-alert-box"
              style={{
                background: 'rgba(167, 255, 82, 0.06)',
                borderColor: 'rgba(167, 255, 82, 0.3)',
                color: 'var(--text)',
              }}
            >
              <ShieldCheck size={22} style={{ color: 'var(--lime)', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--lime)' }}>API Key Added Successfully</strong>
                <p style={{ marginTop: '4px', color: 'var(--muted)', fontSize: '11.5px', lineHeight: 1.5 }}>
                  Your API key has been securely added to this workspace. It is protected by server-side vault encryption and will never be shown in cleartext again.
                </p>
              </div>
            </div>

            <div className="details-modal-grid" style={{ margin: '8px 0' }}>
              <div className="detail-item">
                <small>Provider</small>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getProviderIcon(savedCredential.provider)}
                  {savedCredential.provider}
                </strong>
              </div>

              <div className="detail-item">
                <small>Key Name</small>
                <strong>{savedCredential.name}</strong>
              </div>

              <div className="detail-item">
                <small>Deployment Environment</small>
                <strong>
                  <span className={`env-badge env-${savedCredential.environment.toLowerCase()}`}>
                    {savedCredential.environment}
                  </span>
                </strong>
              </div>

              <div className="detail-item">
                <small>Status</small>
                <strong>
                  <span className="badge badge-lime">Active</span>
                </strong>
              </div>

              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <small>Masked Credential</small>
                <code
                  style={{
                    fontFamily: 'var(--mono)',
                    color: 'var(--lime)',
                    fontSize: '13px',
                    marginTop: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {savedCredential.maskedValue}
                </code>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn"
                onClick={handleDone}
                style={{ minWidth: '110px' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {/* Row 1: Provider / Model Architecture & Deployment Environment */}
            <div className="form-grid">
              <label>
                Provider / Model Architecture
                <div className="select-with-icon-wrap" style={{ position: 'relative' }}>
                  <select
                    value={provider}
                    onChange={e => handleProviderChange(e.target.value as ApiKeyProvider)}
                  >
                    <option value="Google Gemini">Google Gemini</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="NVIDIA">NVIDIA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </label>

              <label>
                Deployment Environment
                <select
                  value={environment}
                  onChange={e => handleEnvironmentChange(e.target.value as ApiKeyEnvironment)}
                >
                  <option value="Development">Development</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                </select>
              </label>
            </div>

            {/* Row 2: API Key / Secret Key with eye icon toggle */}
            <label>
              API Key / Secret Key
              <div className="manual-input-wrap">
                <input
                  required
                  type={showSecret ? 'text' : 'password'}
                  placeholder={getPlaceholderForProvider(provider)}
                  value={secretKey}
                  onChange={e => {
                    setSecretKey(e.target.value)
                    if (formError) setFormError('')
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowSecret(!showSecret)}
                  aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                  title={showSecret ? 'Hide secret key' : 'Show secret key'}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {/* Row 3: Key Name / Description */}
            <label>
              Key Name / Description
              <input
                type="text"
                required
                placeholder="e.g. Axiora Gemini Production"
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  setNameTouched(true)
                  if (formError) setFormError('')
                }}
              />
            </label>

            {/* Row 4: Permissions & Access Scopes */}
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--text)',
                }}
              >
                Permissions & Access Scopes
              </span>
              <div className="scopes-grid">
                {AVAILABLE_SCOPES.map(scope => {
                  const active = selectedScopes.includes(scope.id)
                  return (
                    <div
                      key={scope.id}
                      className={`scope-selector-card ${active ? 'scope-selected' : ''}`}
                      onClick={() => toggleScope(scope.id)}
                      role="checkbox"
                      aria-checked={active}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          toggleScope(scope.id)
                        }
                      }}
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
            </div>

            {/* Row 5: Key Expiration */}
            <label>
              Key Expiration
              <select
                value={expiryDays === null ? 'never' : String(expiryDays)}
                onChange={e =>
                  setExpiryDays(e.target.value === 'never' ? null : Number(e.target.value))
                }
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
                <option value="never">Never Expire</option>
              </select>
            </label>

            {/* Error Message */}
            {formError && (
              <div className="form-error-banner" role="alert">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Actions: Cancel & Save API Key */}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={isSubmitting}
                style={{ minWidth: '130px' }}
              >
                {isSubmitting ? (
                  'Saving...'
                ) : (
                  <>
                    <Check size={15} /> Save API Key
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function CreateNewApiKeyModal({
  isOpen,
  onClose,
  onSaved,
}: CreateNewApiKeyModalProps) {
  if (!isOpen) return null

  return (
    <CreateNewApiKeyModalContent
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
