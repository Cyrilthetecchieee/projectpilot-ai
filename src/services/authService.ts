export interface UserPreferences {
  theme: 'dark' | 'system'
  emailNotifications: boolean
  agentNotifications: boolean
  taskRecommendations: boolean
  riskAlerts: boolean
  progressUpdates: boolean
}

export interface MockUser {
  id: string
  name: string
  email: string
  role: string
  organization: string
  avatar: string | null
  joinedAt: string
  preferences: UserPreferences
}

const USER_KEY = 'projectpilot.auth.user'
const SESSION_KEY = 'projectpilot.auth.session'
const USERS_KEY = 'projectpilot.auth.users'

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  emailNotifications: true,
  agentNotifications: true,
  taskRecommendations: true,
  riskAlerts: true,
  progressUpdates: true,
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))

const normalizeUser = (user: MockUser | null): MockUser | null => user ? ({ ...user, preferences: { ...defaultPreferences, ...user.preferences } }) : null

export const authService = {
  async login(email: string, _password: string): Promise<MockUser> {
    const users = read<MockUser[]>(USERS_KEY, [])
    const user = users.find(item => item.email.toLowerCase() === email.toLowerCase()) || {
      id: `user-${Date.now()}`,
      name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
      email,
      role: 'Engineering Student',
      organization: '',
      avatar: null,
      joinedAt: new Date().toISOString(),
      preferences: defaultPreferences,
    }
    const normalized = normalizeUser(user)!
    write(USERS_KEY, [...users.filter(item => item.id !== normalized.id), normalized])
    write(USER_KEY, normalized)
    localStorage.setItem(SESSION_KEY, 'active')
    return normalized
  },
  async signup(input: Pick<MockUser, 'name' | 'email' | 'role' | 'organization'> & { password: string }): Promise<MockUser> {
    const users = read<MockUser[]>(USERS_KEY, [])
    const user: MockUser = { id: `user-${Date.now()}`, name: input.name, email: input.email, role: input.role, organization: input.organization, avatar: null, joinedAt: new Date().toISOString(), preferences: defaultPreferences }
    write(USERS_KEY, [...users, user])
    write(USER_KEY, user)
    localStorage.setItem(SESSION_KEY, 'active')
    return user
  },
  logout() { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(USER_KEY) },
  getCurrentUser(): MockUser | null { return localStorage.getItem(SESSION_KEY) ? normalizeUser(read<MockUser | null>(USER_KEY, null)) : null },
  isAuthenticated() { return Boolean(localStorage.getItem(SESSION_KEY) && localStorage.getItem(USER_KEY)) },
  async updateProfile(updates: Partial<Pick<MockUser, 'name' | 'email' | 'role' | 'organization' | 'avatar'>>): Promise<MockUser> {
    const current = this.getCurrentUser()
    if (!current) throw new Error('No active mock session')
    const user = normalizeUser({ ...current, ...updates })!
    const users = read<MockUser[]>(USERS_KEY, [])
    write(USERS_KEY, users.map(item => item.id === user.id ? user : item))
    write(USER_KEY, user)
    return user
  },
  async updatePreferences(updates: Partial<UserPreferences>): Promise<MockUser> {
    const current = this.getCurrentUser()
    if (!current) throw new Error('No active mock session')
    const updated = normalizeUser({ ...current, preferences: { ...current.preferences, ...updates } })!
    const users = read<MockUser[]>(USERS_KEY, [])
    write(USERS_KEY, users.map(item => item.id === updated.id ? updated : item))
    write(USER_KEY, updated)
    return updated
  },
}
