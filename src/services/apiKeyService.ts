import type { ApiKey, ApiKeyEnvironment, ApiKeyProvider, CreateApiKeyPayload } from '../types'

const STORAGE_KEY = 'projectpilot.api_keys'

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

const generatePrefix = (provider: ApiKeyProvider, env: ApiKeyEnvironment): string => {
  if (provider === 'Google Gemini') return 'AIzaSy'
  if (provider === 'OpenAI') return 'sk-proj-'
  if (provider === 'Anthropic Claude') return 'sk-ant-'
  const envTag = env === 'Production' ? 'live' : env === 'Staging' ? 'stg' : 'test'
  return `pp_${envTag}_`
}

const maskSecret = (secret: string): string => {
  if (secret.length <= 12) return '••••••••'
  const start = secret.slice(0, 8)
  const end = secret.slice(-4)
  return `${start}••••••••${end}`
}

const defaultKeys: ApiKey[] = [
  {
    id: 'key-seed-01',
    name: 'CI/CD Pipeline Agent Token',
    key: 'pp_live_a982df09e12048f029384bc1723149ba',
    maskedKey: 'pp_live_••••••••49ba',
    provider: 'ProjectPilot',
    environment: 'Production',
    scopes: ['read:project', 'write:project', 'run:agents'],
    status: 'Active',
    createdAt: '2026-09-10T10:00:00.000Z',
    lastUsedAt: '2026-09-19T06:15:20.000Z',
    expiresAt: '2027-09-10T10:00:00.000Z',
  },
  {
    id: 'key-seed-02',
    name: 'Gemini 2.5 Flash Reasoning Provider',
    key: 'AIzaSyDemoProjectPilotGeminiKey2026ValidToken',
    maskedKey: 'AIzaSyDe••••••••Token',
    provider: 'Google Gemini',
    environment: 'Production',
    scopes: ['run:agents', 'admin'],
    status: 'Active',
    createdAt: '2026-09-15T14:30:00.000Z',
    lastUsedAt: 'Just now',
    expiresAt: null,
  },
  {
    id: 'key-seed-03',
    name: 'Local Dev Integration Sandbox',
    key: 'pp_test_f1e2d3c4b5a60718293a4b5c6d7e8f90',
    maskedKey: 'pp_test_••••••••8f90',
    provider: 'ProjectPilot',
    environment: 'Development',
    scopes: ['read:project'],
    status: 'Revoked',
    createdAt: '2026-08-01T08:00:00.000Z',
    lastUsedAt: '2026-08-14T11:22:00.000Z',
    expiresAt: null,
  },
]

const readStorage = (): ApiKey[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      writeStorage(defaultKeys)
      return defaultKeys
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultKeys
  } catch {
    return defaultKeys
  }
}

const writeStorage = (keys: ApiKey[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // Ignore quota errors in storage
  }
}

export const apiKeyService = {
  getApiKeys(): ApiKey[] {
    return readStorage()
  },

  getApiKey(id: string): ApiKey | undefined {
    return this.getApiKeys().find(k => k.id === id)
  },

  createApiKey(payload: CreateApiKeyPayload): { apiKey: ApiKey; rawSecret: string } {
    const keys = this.getApiKeys()
    const prefix = generatePrefix(payload.provider, payload.environment)
    const rawSecret = payload.secretKey?.trim() || `${prefix}${generateRandomString(32)}`

    const expiresAt = payload.expiresInDays
      ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    const newKey: ApiKey = {
      id: `key-${Date.now()}-${generateRandomString(6)}`,
      name: payload.name.trim() || 'Untitled API Key',
      key: rawSecret,
      maskedKey: maskSecret(rawSecret),
      provider: payload.provider,
      environment: payload.environment,
      scopes: payload.scopes.length ? payload.scopes : ['read:project'],
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt,
    }

    const updated = [newKey, ...keys]
    writeStorage(updated)
    return { apiKey: newKey, rawSecret }
  },

  revokeApiKey(id: string): ApiKey | undefined {
    const keys = this.getApiKeys()
    let updatedKey: ApiKey | undefined
    const updated = keys.map(k => {
      if (k.id === id) {
        updatedKey = { ...k, status: 'Revoked' as const }
        return updatedKey
      }
      return k
    })
    writeStorage(updated)
    return updatedKey
  },

  restoreApiKey(id: string): ApiKey | undefined {
    const keys = this.getApiKeys()
    let updatedKey: ApiKey | undefined
    const updated = keys.map(k => {
      if (k.id === id) {
        updatedKey = { ...k, status: 'Active' as const }
        return updatedKey
      }
      return k
    })
    writeStorage(updated)
    return updatedKey
  },

  deleteApiKey(id: string): void {
    const keys = this.getApiKeys().filter(k => k.id !== id)
    writeStorage(keys)
  },

  validateApiKey(token: string): { valid: boolean; key?: ApiKey; message: string } {
    const cleanToken = token.trim()
    const keys = this.getApiKeys()
    const match = keys.find(k => k.key === cleanToken)

    if (!match) {
      return { valid: false, message: 'Invalid API Key' }
    }
    if (match.status === 'Revoked') {
      return { valid: false, message: 'API Key has been revoked' }
    }
    if (match.expiresAt && new Date(match.expiresAt).getTime() < Date.now()) {
      return { valid: false, message: 'API Key has expired' }
    }

    // Update last used
    const updated = keys.map(k => (k.id === match.id ? { ...k, lastUsedAt: 'Just now' } : k))
    writeStorage(updated)

    return { valid: true, key: match, message: 'Authentication successful' }
  },

  getActiveAiKey(): ApiKey | undefined {
    const keys = this.getApiKeys()
    return keys.find(
      k =>
        k.status === 'Active' &&
        (k.provider === 'Google Gemini' ||
          k.provider === 'OpenAI' ||
          k.provider === 'Anthropic Claude' ||
          k.scopes.includes('run:agents'))
    )
  },

  getAiEngineStatus(): {
    mode: 'Live Connected' | 'Mock Mode'
    providerName: string
    activeKey?: ApiKey
    totalActiveKeys: number
  } {
    const keys = this.getApiKeys()
    const activeKeys = keys.filter(k => k.status === 'Active')
    const primaryKey = this.getActiveAiKey()

    if (primaryKey) {
      return {
        mode: 'Live Connected',
        providerName: primaryKey.provider,
        activeKey: primaryKey,
        totalActiveKeys: activeKeys.length,
      }
    }

    return {
      mode: 'Mock Mode',
      providerName: 'Internal Mock Engine',
      activeKey: undefined,
      totalActiveKeys: activeKeys.length,
    }
  },

  resetDemoKeys(): ApiKey[] {
    writeStorage(defaultKeys)
    return defaultKeys
  },
}
