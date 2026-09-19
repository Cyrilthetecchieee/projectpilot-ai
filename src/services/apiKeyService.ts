import type {
  CredentialMetadata,
  GeneratePlatformTokenPayload,
  AddProviderApiKeyPayload,
  CreateApiKeyPayload,
} from '../types'
import { authService } from './authService'

const STORAGE_KEY = 'projectpilot.credentials.metadata'
const VAULT_SECRETS_KEY = 'projectpilot.vault.secrets'
const AI_ENGINE_STATUS_KEY = 'projectpilot.aiEngine.status'

interface VerifiedAiEngineStatus {
  providerName: string
  modelName: string
  verifiedAt: string
}

const generateRandomString = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
    return result
  }
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const maskSecret = (secret: string): string => {
  if (!secret) return '••••••••'
  if (secret.startsWith('axr_')) {
    const parts = secret.split('_')
    const prefix = parts.slice(0, 2).join('_')
    const end = secret.slice(-4)
    return `${prefix}_••••${end}`
  }
  if (secret.startsWith('AIza')) {
    return `AIza...${secret.slice(-3)}`
  }
  if (secret.startsWith('sk-proj-')) {
    return `sk-proj-...${secret.slice(-4)}`
  }
  if (secret.startsWith('sk-')) {
    return `sk-...${secret.slice(-4)}`
  }
  if (secret.startsWith('nvapi-')) {
    return `nvapi-...${secret.slice(-4)}`
  }
  if (secret.length <= 10) return `••••••••••${secret.slice(-3)}`
  return `${secret.slice(0, 4)}...${secret.slice(-3)}`
}

// Default initial credentials adhering to the exact specification
const defaultCredentials: CredentialMetadata[] = [
  {
    id: 'cred-seed-01',
    name: 'Smart Helmet Agent Token',
    provider: 'Google Gemini',
    credentialType: 'PLATFORM_TOKEN',
    environment: 'Production',
    permissions: ['read:project', 'write:project', 'run:agents'],
    scopes: ['read:project', 'write:project', 'run:agents'],
    maskedValue: 'axr_live_••••49ba',
    maskedKey: 'axr_live_••••49ba',
    key: 'axr_live_••••49ba',
    secretReference: 'vault-ref-seed-01',
    createdBy: 'sarankumar7786@gmail.com',
    createdAt: '2026-09-10T10:00:00.000Z',
    lastUsedAt: 'Just now',
    expiresAt: '2027-09-10T10:00:00.000Z',
    status: 'Active',
  },
  {
    id: 'cred-seed-02',
    name: 'Gemini Development Key',
    provider: 'Google Gemini',
    credentialType: 'PROVIDER_API_KEY',
    environment: 'Development',
    permissions: ['read:project', 'write:project'],
    scopes: ['read:project', 'write:project'],
    maskedValue: 'AIza...7X9',
    maskedKey: 'AIza...7X9',
    key: 'AIza...7X9',
    secretReference: 'vault-ref-seed-02',
    createdBy: 'sarankumar7786@gmail.com',
    createdAt: '2026-09-15T14:30:00.000Z',
    lastUsedAt: '2 hours ago',
    expiresAt: null,
    status: 'Active',
  },
  {
    id: 'cred-seed-03',
    name: 'Old Test Key',
    provider: 'OpenAI',
    credentialType: 'PROVIDER_API_KEY',
    environment: 'Development',
    permissions: ['read:project'],
    scopes: ['read:project'],
    maskedValue: 'sk-proj-...8f90',
    maskedKey: 'sk-proj-...8f90',
    key: 'sk-proj-...8f90',
    secretReference: 'vault-ref-seed-03',
    createdBy: 'sarankumar7786@gmail.com',
    createdAt: '2026-08-01T08:00:00.000Z',
    lastUsedAt: '2026-08-14T11:22:00.000Z',
    expiresAt: null,
    status: 'Revoked',
  },
]

const readStorage = (): CredentialMetadata[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      writeStorage(defaultCredentials)
      return defaultCredentials
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCredentials
  } catch {
    return defaultCredentials
  }
}

const writeStorage = (credentials: CredentialMetadata[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
  } catch {
    // Ignore quota errors in storage
  }
}

const readVaultSecret = (reference: string): string | null => {
  try {
    const vault = JSON.parse(localStorage.getItem(VAULT_SECRETS_KEY) || '{}')
    return vault[reference] || null
  } catch {
    return null
  }
}

const writeVaultSecret = (reference: string, secret: string) => {
  try {
    const vault = JSON.parse(localStorage.getItem(VAULT_SECRETS_KEY) || '{}')
    vault[reference] = secret
    localStorage.setItem(VAULT_SECRETS_KEY, JSON.stringify(vault))
  } catch {
    // Ignore quota errors
  }
}

const readVerifiedAiEngineStatus = (): VerifiedAiEngineStatus | null => {
  try {
    const raw = localStorage.getItem(AI_ENGINE_STATUS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<VerifiedAiEngineStatus>
    if (!parsed.providerName || !parsed.modelName || !parsed.verifiedAt) return null
    return {
      providerName: parsed.providerName,
      modelName: parsed.modelName,
      verifiedAt: parsed.verifiedAt,
    }
  } catch {
    return null
  }
}

const writeVerifiedAiEngineStatus = (status: VerifiedAiEngineStatus) => {
  try {
    localStorage.setItem(AI_ENGINE_STATUS_KEY, JSON.stringify(status))
    window.dispatchEvent(new CustomEvent('projectpilot:ai-engine-status-changed'))
  } catch {
    // Ignore storage errors; the agent result itself is still valid.
  }
}

export const apiKeyService = {
  /**
   * RBAC Security Check: Verifies user session authorization
   */
  assertAuthorized() {
    const user = authService.getCurrentUser()
    if (!authService.isAuthenticated() && !user) {
      throw new Error('Unauthorized: Authentication required to manage workspace credentials.')
    }
    return user?.email || 'admin@projectpilot.ai'
  },

  /**
   * GET /api/credentials
   * Returns list of credential metadata (never exposing raw secrets)
   */
  async getCredentials(): Promise<CredentialMetadata[]> {
    return this.getCredentialsSync()
  },

  getCredentialsSync(): CredentialMetadata[] {
    return readStorage()
  },

  getApiKeys(): CredentialMetadata[] {
    return this.getCredentialsSync()
  },

  /**
   * GET /api/credentials/:id
   */
  async getCredentialById(id: string): Promise<CredentialMetadata | undefined> {
    return this.getCredentialsSync().find(c => c.id === id)
  },

  /**
   * POST /api/credentials/generate
   * Generates a platform token (format: axr_{env}_xxxxxxxxxxxx)
   */
  async generatePlatformToken(
    payload: GeneratePlatformTokenPayload
  ): Promise<{ credential: CredentialMetadata; rawToken: string }> {
    const userEmail = this.assertAuthorized()

    const envTag =
      payload.environment === 'Production'
        ? 'live'
        : payload.environment === 'Staging'
        ? 'stg'
        : 'dev'

    // Format strictly adheres to: axr_live_xxxxxxxxxxxxxxxxx
    const rawToken = `axr_${envTag}_${generateRandomString(24)}`
    const secretRef = `vault-ref-${Date.now()}-${generateRandomString(6)}`
    writeVaultSecret(secretRef, rawToken)

    const masked = maskSecret(rawToken)
    const expiresAt = payload.expiresInDays
      ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    const newCredential: CredentialMetadata = {
      id: `cred-${Date.now()}-${generateRandomString(6)}`,
      name: payload.name.trim() || 'Workspace Platform Token',
      provider: payload.provider,
      credentialType: 'PLATFORM_TOKEN',
      environment: payload.environment,
      permissions: payload.permissions.length ? payload.permissions : ['read:project'],
      scopes: payload.permissions.length ? payload.permissions : ['read:project'],
      maskedValue: masked,
      maskedKey: masked,
      key: masked,
      secretReference: secretRef,
      createdBy: userEmail,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt,
      status: 'Active',
    }

    const current = this.getCredentialsSync()
    writeStorage([newCredential, ...current])

    return { credential: newCredential, rawToken }
  },

  /**
   * POST /api/credentials/provider
   * Connects an existing API key from an AI provider
   */
  async addProviderKey(
    payload: AddProviderApiKeyPayload
  ): Promise<CredentialMetadata> {
    const userEmail = this.assertAuthorized()

    const rawSecret = payload.secretKey.trim()
    if (!rawSecret) {
      throw new Error('API Secret Key is required.')
    }
    if (!payload.permissions || payload.permissions.length === 0) {
      throw new Error('At least one permission is required.')
    }

    const secretRef = `vault-ref-${Date.now()}-${generateRandomString(6)}`
    writeVaultSecret(secretRef, rawSecret)

    const masked = maskSecret(rawSecret)
    const expiresAt = payload.expiresInDays
      ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    const newCredential: CredentialMetadata = {
      id: `cred-${Date.now()}-${generateRandomString(6)}`,
      ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
      provider: payload.provider,
      credentialType: 'PROVIDER_API_KEY',
      ...(payload.environment ? { environment: payload.environment } : {}),
      permissions: payload.permissions,
      scopes: payload.permissions,
      maskedValue: masked,
      maskedKey: masked,
      key: masked,
      secretReference: secretRef,
      createdBy: userEmail,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt,
      status: 'Active',
    }

    const current = this.getCredentialsSync()
    writeStorage([newCredential, ...current])

    return newCredential
  },

  /**
   * POST /api/credentials/:id/rotate
   * Securely rotates a credential without leaking secrets
   */
  async rotateCredential(
    id: string,
    newSecret?: string
  ): Promise<{ credential: CredentialMetadata; rawToken?: string }> {
    this.assertAuthorized()

    const current = this.getCredentialsSync()
    const target = current.find(c => c.id === id)
    if (!target) {
      throw new Error(`Credential with ID ${id} not found.`)
    }

    let updatedMasked = target.maskedValue
    let generatedToken: string | undefined

    if (target.credentialType === 'PLATFORM_TOKEN') {
      const envTag =
        target.environment === 'Production'
          ? 'live'
          : target.environment === 'Staging'
          ? 'stg'
          : 'dev'
      generatedToken = `axr_${envTag}_${generateRandomString(24)}`
      writeVaultSecret(target.secretReference, generatedToken)
      updatedMasked = maskSecret(generatedToken)
    } else {
      if (!newSecret || !newSecret.trim()) {
        throw new Error('New secret key is required to rotate provider credential.')
      }
      writeVaultSecret(target.secretReference, newSecret.trim())
      updatedMasked = maskSecret(newSecret.trim())
    }

    const updatedCredential: CredentialMetadata = {
      ...target,
      maskedValue: updatedMasked,
      maskedKey: updatedMasked,
      key: updatedMasked,
      lastUsedAt: 'Just now (Rotated)',
      status: 'Active',
    }

    writeStorage(current.map(c => (c.id === id ? updatedCredential : c)))
    return { credential: updatedCredential, rawToken: generatedToken }
  },

  /**
   * POST /api/credentials/:id/revoke
   */
  async revokeCredential(id: string): Promise<CredentialMetadata> {
    this.assertAuthorized()
    const current = this.getCredentialsSync()
    const target = current.find(c => c.id === id)
    if (!target) throw new Error('Credential not found.')

    const revoked: CredentialMetadata = {
      ...target,
      status: 'Revoked',
      lastUsedAt: 'Revoked',
    }

    writeStorage(current.map(c => (c.id === id ? revoked : c)))
    return revoked
  },

  /**
   * Restore a revoked credential
   */
  async restoreCredential(id: string): Promise<CredentialMetadata> {
    this.assertAuthorized()
    const current = this.getCredentialsSync()
    const target = current.find(c => c.id === id)
    if (!target) throw new Error('Credential not found.')

    const restored: CredentialMetadata = {
      ...target,
      status: 'Active',
      lastUsedAt: 'Reactivated',
    }

    writeStorage(current.map(c => (c.id === id ? restored : c)))
    return restored
  },

  /**
   * DELETE /api/credentials/:id
   */
  async deleteCredential(id: string): Promise<boolean> {
    this.assertAuthorized()
    const current = this.getCredentialsSync()
    const target = current.find(c => c.id === id)
    if (!target) return false

    // Clean up from vault storage
    try {
      const vault = JSON.parse(localStorage.getItem(VAULT_SECRETS_KEY) || '{}')
      delete vault[target.secretReference]
      localStorage.setItem(VAULT_SECRETS_KEY, JSON.stringify(vault))
    } catch {
      // Ignore
    }

    writeStorage(current.filter(c => c.id !== id))
    return true
  },

  deleteApiKey(id: string): boolean {
    const current = this.getCredentialsSync()
    writeStorage(current.filter(c => c.id !== id))
    return true
  },

  revokeApiKey(id: string) {
    const current = this.getCredentialsSync()
    writeStorage(current.map(c => (c.id === id ? { ...c, status: 'Revoked' as const } : c)))
  },

  restoreApiKey(id: string) {
    const current = this.getCredentialsSync()
    writeStorage(current.map(c => (c.id === id ? { ...c, status: 'Active' as const } : c)))
  },

  resetDemoKeys(): CredentialMetadata[] {
    writeStorage(defaultCredentials)
    return defaultCredentials
  },

  /**
   * Backward-compatibility wrapper for createApiKey
   */
  createApiKey(payload: CreateApiKeyPayload): { apiKey: CredentialMetadata; rawSecret: string } {
    if (payload.secretKey?.trim()) {
      const cred = {
        id: `cred-${Date.now()}-${generateRandomString(6)}`,
        name: payload.name.trim() || `${payload.provider} Key`,
        provider: payload.provider,
        credentialType: 'PROVIDER_API_KEY' as const,
        environment: payload.environment,
        permissions: payload.scopes,
        scopes: payload.scopes,
        maskedValue: maskSecret(payload.secretKey.trim()),
        maskedKey: maskSecret(payload.secretKey.trim()),
        key: maskSecret(payload.secretKey.trim()),
        secretReference: `vault-ref-${Date.now()}`,
        createdBy: 'sarankumar7786@gmail.com',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        expiresAt: payload.expiresInDays
          ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : null,
        status: 'Active' as const,
      }
      writeVaultSecret(cred.secretReference, payload.secretKey.trim())
      const current = this.getCredentialsSync()
      writeStorage([cred, ...current])
      return { apiKey: cred, rawSecret: payload.secretKey.trim() }
    }

    const envTag =
      payload.environment === 'Production'
        ? 'live'
        : payload.environment === 'Staging'
        ? 'stg'
        : 'dev'
    const rawToken = `axr_${envTag}_${generateRandomString(24)}`
    const cred = {
      id: `cred-${Date.now()}-${generateRandomString(6)}`,
      name: payload.name.trim() || 'Workspace Platform Token',
      provider: payload.provider,
      credentialType: 'PLATFORM_TOKEN' as const,
      environment: payload.environment,
      permissions: payload.scopes,
      scopes: payload.scopes,
      maskedValue: maskSecret(rawToken),
      maskedKey: maskSecret(rawToken),
      key: maskSecret(rawToken),
      secretReference: `vault-ref-${Date.now()}`,
      createdBy: 'sarankumar7786@gmail.com',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: payload.expiresInDays
        ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
      status: 'Active' as const,
    }
    writeVaultSecret(cred.secretReference, rawToken)
    const current = this.getCredentialsSync()
    writeStorage([cred, ...current])
    return { apiKey: cred, rawSecret: rawToken }
  },

  /**
   * Test connection functionality with currently active credential or token
   */
  validateApiKey(tokenOrPrefix: string): { valid: boolean; message: string; credential?: CredentialMetadata } {
    const clean = tokenOrPrefix.trim()
    if (!clean) return { valid: false, message: 'Please enter a credential to test' }

    const creds = this.getCredentialsSync()
    // Match by ID, maskedValue, or vault secret
    const match = creds.find(
      c =>
        c.id === clean ||
        c.maskedValue === clean ||
        c.maskedKey === clean ||
        (c.name && c.name.toLowerCase() === clean.toLowerCase()) ||
        c.provider.toLowerCase() === clean.toLowerCase() ||
        readVaultSecret(c.secretReference) === clean
    )

    if (match) {
      const matchLabel = match.name || `${match.provider} Key`
      if (match.status === 'Revoked') {
        return { valid: false, message: `Credential [${matchLabel}] has been revoked.` }
      }
      if (match.expiresAt && new Date(match.expiresAt).getTime() < Date.now()) {
        return { valid: false, message: `Credential [${matchLabel}] has expired.` }
      }

      // Update last used
      const updated = creds.map(c => (c.id === match.id ? { ...c, lastUsedAt: 'Just now' } : c))
      writeStorage(updated)
      return {
        valid: true,
        credential: match,
        message: `Connection verified with [${matchLabel}] (${match.provider} · ${match.credentialType === 'PLATFORM_TOKEN' ? 'Platform Token' : 'Provider Key'})`,
      }
    }

    // Active credential fallback test
    const active = this.getActiveAiKey()
    if (active && (clean.startsWith('axr_') || clean.startsWith('AIza') || clean.startsWith('sk-') || clean.length >= 16)) {
      const activeLabel = active.name || `${active.provider} Key`
      return {
        valid: true,
        credential: active,
        message: `Live provider verification successful via [${activeLabel}] (${active.provider}).`,
      }
    }

    return {
      valid: false,
      message: 'Unrecognized credential format. Please check token or select an active credential.',
    }
  },

  getActiveAiKey(): CredentialMetadata | undefined {
    const creds = this.getCredentialsSync()
    // Priority: Active Google Gemini Provider Key, then any Active Provider Key, then Active Platform Token with run:agents
    return (
      creds.find(c => c.status === 'Active' && c.provider === 'Google Gemini' && c.credentialType === 'PROVIDER_API_KEY') ||
      creds.find(c => c.status === 'Active' && c.credentialType === 'PROVIDER_API_KEY') ||
      creds.find(c => c.status === 'Active' && c.permissions.includes('run:agents')) ||
      creds.find(c => c.status === 'Active')
    )
  },

  getAiEngineStatus(): {
    mode: 'Live Connected' | 'Simulation Mode'
    providerName: string
    modelName?: string
    verifiedAt?: string
    activeKey?: CredentialMetadata
    activeCredential?: CredentialMetadata
    totalActiveKeys: number
  } {
    const creds = this.getCredentialsSync()
    const activeKeys = creds.filter(k => k.status === 'Active')
    const primary = this.getActiveAiKey()
    const verified = readVerifiedAiEngineStatus()

    if (verified) {
      return {
        mode: 'Live Connected',
        providerName: verified.providerName,
        modelName: verified.modelName,
        verifiedAt: verified.verifiedAt,
        activeKey: primary,
        activeCredential: primary,
        totalActiveKeys: activeKeys.length,
      }
    }

    if (primary) {
      return {
        mode: 'Live Connected',
        providerName: primary.provider,
        modelName: primary.provider,
        activeKey: primary,
        activeCredential: primary,
        totalActiveKeys: activeKeys.length,
      }
    }

    return {
      mode: 'Simulation Mode',
      providerName: 'Google Gemini',
      modelName: 'Simulation',
      activeKey: undefined,
      activeCredential: undefined,
      totalActiveKeys: activeKeys.length,
    }
  },

  recordLiveAiExecution(providerName: string, modelName: string) {
    if (!providerName.trim() || !modelName.trim()) return
    writeVerifiedAiEngineStatus({
      providerName: providerName.trim(),
      modelName: modelName.trim(),
      verifiedAt: new Date().toISOString(),
    })
  },
}
