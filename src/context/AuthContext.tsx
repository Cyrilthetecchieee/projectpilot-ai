import { createContext, useContext, useState, type ReactNode } from 'react'
import { authService, type MockUser, type UserPreferences } from '../services/authService'

interface AuthContextValue {
  user: MockUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<MockUser>
  signup: (input: Pick<MockUser, 'name' | 'email' | 'role' | 'organization'> & { password: string }) => Promise<MockUser>
  logout: () => void
  updateProfile: (updates: Partial<Pick<MockUser, 'name' | 'email' | 'role' | 'organization' | 'avatar'>>) => Promise<MockUser>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<MockUser>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(() => authService.getCurrentUser())
  const [isLoading, setIsLoading] = useState(false)
  const login = async (email: string, password: string) => { setIsLoading(true); try { const next = await authService.login(email, password); setUser(next); return next } finally { setIsLoading(false) } }
  const signup = async (input: Pick<MockUser, 'name' | 'email' | 'role' | 'organization'> & { password: string }) => { setIsLoading(true); try { const next = await authService.signup(input); setUser(next); return next } finally { setIsLoading(false) } }
  const logout = () => { authService.logout(); setUser(null) }
  const updateProfile = async (updates: Partial<Pick<MockUser, 'name' | 'email' | 'role' | 'organization' | 'avatar'>>) => { const next = await authService.updateProfile(updates); setUser(next); return next }
  const updatePreferences = async (updates: Partial<UserPreferences>) => { const next = await authService.updatePreferences(updates); setUser(next); return next }
  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), isLoading, login, signup, logout, updateProfile, updatePreferences }}>{children}</AuthContext.Provider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context }
