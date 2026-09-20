import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Hexagon,
  LockKeyhole,
  LogOut,
  Moon,
  Palette,
  Pencil,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/projectService'
import type { MockUser, UserPreferences } from '../services/authService'
import { TechnologyFooter } from '../components/TechnologyAttribution'

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'PP'
  )
}

export function Avatar({ user, large = false }: { user: MockUser; large?: boolean }) {
  return user.avatar ? (
    <img
      className={`user-avatar ${large ? 'user-avatar-large' : ''}`}
      src={user.avatar}
      alt={`${user.name} avatar`}
    />
  ) : (
    <span className={`user-avatar ${large ? 'user-avatar-large' : ''}`}>
      {initials(user.name)}
    </span>
  )
}

function AccountBadge({ children }: { children: ReactNode }) {
  return <span className="badge badge-lime">{children}</span>
}

function AuthLayout({
  children,
  title,
  description,
}: {
  children: ReactNode
  title: ReactNode
  description: string
}) {
  return (
    <main className="auth-page">
      <section className="auth-context">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Hexagon size={18} />
          </span>
          <span>
            ProjectPilot <b>AI</b>
          </span>
        </Link>
        <span className="badge badge-lime auth-kicker">AGENTIC ENGINEERING WORKSPACE</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="auth-flow">
          {['IDEA', 'REQUIREMENTS', 'ARCHITECTURE', 'EXECUTION', 'VALIDATION'].map(
            (item, index) => (
              <div key={item}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{item}</b>
                {index < 4 && <ArrowDown size={14} />}
              </div>
            )
          )}
        </div>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card">{children}</div>
        <TechnologyFooter />
      </section>
    </main>
  )
}

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  error?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="auth-label">
      {label}
      <div className="password-field">
        <input
          required
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="form-error">{error}</span>}
    </label>
  )
}

function FieldError({ children }: { children?: string }) {
  return children ? <span className="form-error">{children}</span> : null
}

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')
    await login(email, password)
    const intended = (location.state as { from?: string } | null)?.from
    navigate(intended || `/project/${projectService.getProjects()[0]?.id || 'smart-helmet'}`, {
      replace: true,
      state: { toast: 'Welcome back to ProjectPilot.' },
    })
  }

  return (
    <AuthLayout
      title={
        <>
          Welcome back,
          <br />
          <em>Engineer.</em>
        </>
      }
      description="Continue building, reviewing, and executing your engineering projects with your AI agent team."
    >
      <div className="auth-heading">
        <span className="eyebrow">SECURE WORKSPACE ACCESS</span>
        <h2>Sign in to ProjectPilot</h2>
        <p>Access your projects and continue where you left off.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-label">
          Email Address
          <input
            required
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
          />
        </label>
        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {error && <FieldError>{error}</FieldError>}
        <div className="auth-options">
          <label className="check-label">
            <input type="checkbox" />
            Remember me
          </label>
          <button type="button" className="text-button">
            Forgot password?
          </button>
        </div>
        <button className="btn auth-submit" type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
        </button>
      </form>
      <p className="auth-switch">
        Don't have an account? <Link to="/signup">Create Account</Link>
      </p>
    </AuthLayout>
  )
}

export function SignupPage() {
  const { signup, isLoading } = useAuth()
  const navigate = useNavigate()
  const [value, setValue] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'Engineering Student',
    organization: '',
  })
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!value.name.trim()) next.name = 'Full name is required.'
    if (!/^\S+@\S+\.\S+$/.test(value.email)) next.email = 'Enter a valid email address.'
    if (value.password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (value.password !== value.confirm) next.confirm = 'Passwords must match.'
    if (!value.role) next.role = 'Select a role.'
    if (!terms) next.terms = 'Accept the Terms of Use and Privacy Policy to continue.'
    setErrors(next)
    if (Object.keys(next).length) return

    await signup({
      name: value.name.trim(),
      email: value.email,
      password: value.password,
      role: value.role,
      organization: value.organization.trim(),
    })
    navigate('/project/smart-helmet', {
      replace: true,
      state: { toast: 'Welcome to ProjectPilot.' },
    })
  }

  const update = (key: keyof typeof value, next: string) =>
    setValue(current => ({ ...current, [key]: next }))

  return (
    <AuthLayout
      title={
        <>
          Build the next
          <br />
          <em>great system.</em>
        </>
      }
      description="Turn engineering ideas into a clear plan with an AI execution team that keeps your project moving."
    >
      <div className="auth-heading">
        <span className="eyebrow">CREATE WORKSPACE IDENTITY</span>
        <h2>Create account</h2>
        <p>Build smarter engineering projects with an AI execution team.</p>
      </div>
      <form className="auth-form signup-form" onSubmit={submit}>
        <label className="auth-label">
          Full Name
          <input
            required
            value={value.name}
            onChange={event => update('name', event.target.value)}
            autoComplete="name"
            placeholder="Alex Morgan"
          />
          <FieldError>{errors.name}</FieldError>
        </label>
        <label className="auth-label">
          Email Address
          <input
            required
            type="email"
            value={value.email}
            onChange={event => update('email', event.target.value)}
            autoComplete="email"
            placeholder="alex@example.com"
          />
          <FieldError>{errors.email}</FieldError>
        </label>
        <div className="auth-grid">
          <PasswordInput
            label="Password"
            value={value.password}
            onChange={next => update('password', next)}
            autoComplete="new-password"
            error={errors.password}
          />
          <PasswordInput
            label="Confirm Password"
            value={value.confirm}
            onChange={next => update('confirm', next)}
            autoComplete="new-password"
            error={errors.confirm}
          />
        </div>
        <div className="auth-grid">
          <label className="auth-label">
            Role
            <select value={value.role} onChange={event => update('role', event.target.value)}>
              {[
                'Engineering Student',
                'Developer',
                'Researcher',
                'Project Team Member',
                'Other',
              ].map(role => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <FieldError>{errors.role}</FieldError>
          </label>
          <label className="auth-label">
            College / Organization
            <input
              value={value.organization}
              onChange={event => update('organization', event.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>
        <label className="check-label terms">
          <input
            type="checkbox"
            checked={terms}
            onChange={event => setTerms(event.target.checked)}
          />
          <span>
            I agree to the{' '}
            <button type="button" className="text-button">
              Terms of Use
            </button>{' '}
            and{' '}
            <button type="button" className="text-button">
              Privacy Policy
            </button>
          </span>
        </label>
        <FieldError>{errors.terms}</FieldError>
        <button className="btn auth-submit" type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'} <ArrowRight size={16} />
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </AuthLayout>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  )
}

/**
 * Top navigation bar for full Account pages (/settings and /profile)
 */
export function AccountNavbar({
  title,
  backTo,
}: {
  title: string
  backTo?: string
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const projects = projectService.getProjects()
  const activeProjectId = Object.values(projects).find((p: any) => p.id === 'smart-helmet')?.id || Object.values(projects)[0]?.id || 'smart-helmet'
  const activeProject = projectService.getProject(activeProjectId)

  return (
    <header className="account-navbar">
      <div className="account-navbar-left">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Hexagon size={18} />
          </span>
          <span>
            ProjectPilot <b>AI</b>
          </span>
        </Link>
        <div className="breadcrumbs">
          <Link to={`/project/${activeProjectId}`}>Projects</Link>
          <ChevronRight size={14} />
          <Link to={`/project/${activeProjectId}`}>{activeProject?.name || 'Workspace'}</Link>
          <ChevronRight size={14} />
          <b>{title}</b>
        </div>
      </div>
      <div className="account-navbar-right">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(backTo || `/project/${activeProjectId}`)}
        >
          <ArrowLeft size={15} /> Back to Workspace
        </button>
        {user && (
          <ProfileMenu
            user={user}
            onLogout={() => {
              logout()
              navigate('/')
            }}
          />
        )}
      </div>
    </header>
  )
}

export function ProfileMenu({ user, onLogout }: { user: MockUser; onLogout: () => void }) {
  const { updatePreferences } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const theme = user.preferences?.theme || 'dark'

  const toggleTheme = async () => {
    const cycle: ('dark' | 'slate' | 'midnight')[] = ['dark', 'slate', 'midnight']
    const nextIndex = (cycle.indexOf(theme) + 1) % cycle.length
    const nextTheme = cycle[nextIndex]
    await updatePreferences({ theme: nextTheme })
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  useEffect(() => {
    // Sync active theme to html attribute on mount/change
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [])

  return (
    <>
      <div className="profile-menu" ref={ref}>
        <button
          type="button"
          className="profile-trigger"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          title="Account profile and settings"
        >
          <Avatar user={user} />
          <span>{user.name}</span>
          <ChevronDown size={14} />
        </button>

        {open && (
          <div className="profile-dropdown">
            <div className="profile-dropdown-head">
              <Avatar user={user} />
              <div className="profile-dropdown-meta">
                <strong className="profile-name">{user.name}</strong>
                <span className="profile-role">{user.role}</span>
                <small className="profile-email" title={user.email}>{user.email}</small>
              </div>
            </div>

            <div className="dropdown-rule" />

            <Link to="/profile" onClick={() => setOpen(false)}>
              <UserRound size={15} />
              View Profile
            </Link>

            <Link to="/settings" onClick={() => setOpen(false)}>
              <Settings size={15} />
              Account Settings
            </Link>

            <div className="dropdown-rule" />

            <button
              type="button"
              className="dropdown-theme"
              onClick={toggleTheme}
              title="Click to cycle theme"
            >
              <Moon size={15} />
              <span>Theme</span>
              <b>{theme === 'dark' ? 'Cyber Dark' : theme === 'slate' ? 'Slate' : 'Midnight'}</b>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setConfirm(true)
              }}
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false)
            onLogout()
          }}
        />
      )}
    </>
  )
}

function ConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          <X size={17} />
        </button>
        <span className="icon-box">
          <LogOut size={18} />
        </span>
        <h2>Sign out of ProjectPilot?</h2>
        <p>
          Your projects are saved in local storage. You can continue where you left off the next time
          you sign in.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={onConfirm}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ user, onEdit }: { user: MockUser; onEdit: () => void }) {
  return (
    <div className="panel profile-card">
      <Avatar user={user} large />
      <div>
        <span className="eyebrow">PROJECTPILOT MEMBER</span>
        <h2>{user.name}</h2>
        <p>{user.role}</p>
        <span>{user.organization || 'Independent engineering workspace'}</span>
      </div>
      <button type="button" className="btn btn-secondary" onClick={onEdit}>
        <Pencil size={15} />
        Edit Profile
      </button>
    </div>
  )
}

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState('')
  const [value, setValue] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
    organization: user?.organization || '',
    avatar: user?.avatar || null,
  }))

  if (!user) return <Navigate to="/login" />

  const projects = projectService.getProjects()

  const save = async (event: FormEvent) => {
    event.preventDefault()
    await updateProfile(value)
    setEditing(false)
    setToast('Profile updated successfully.')
    setTimeout(() => setToast(''), 2500)
  }

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setValue(current => ({ ...current, avatar: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  return (
    <div className="account-page-wrap">
      <AccountNavbar title="My Profile" />

      <div className="account-page">
        <PageHeaderSimple
          title="My Profile"
          text="Manage your ProjectPilot engineering identity, role, and active projects."
        />

        {editing ? (
          <form className="panel profile-form" onSubmit={save}>
            <div className="avatar-editor">
              <Avatar user={{ ...user, ...value }} large />
              <label className="btn btn-secondary upload-button">
                Choose New Avatar
                <input type="file" accept="image/*" onChange={chooseAvatar} />
              </label>
            </div>

            <h2>Personal Information</h2>
            <div className="auth-grid">
              <label className="auth-label">
                Full Name
                <input
                  required
                  value={value.name}
                  onChange={event => setValue({ ...value, name: event.target.value })}
                />
              </label>
              <label className="auth-label">
                Email Address
                <input
                  required
                  type="email"
                  value={value.email}
                  onChange={event => setValue({ ...value, email: event.target.value })}
                />
              </label>
              <label className="auth-label">
                Role
                <input
                  required
                  value={value.role}
                  onChange={event => setValue({ ...value, role: event.target.value })}
                />
              </label>
              <label className="auth-label">
                College / Organization
                <input
                  value={value.organization}
                  onChange={event => setValue({ ...value, organization: event.target.value })}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button className="btn" type="submit">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <ProfileCard user={user} onEdit={() => setEditing(true)} />
        )}

        <section>
          <div className="section-label">
            <div>
              <h2>Engineering Workspace Signals</h2>
              <span>Aggregated activity across all projects</span>
            </div>
          </div>
          <div className="activity-stats">
            {[
              ['Projects', projects.length],
              [
                'Agent Runs',
                projects.reduce((sum, project) => sum + project.activity.length, 0) + 13,
              ],
              [
                'Tasks Completed',
                projects.reduce(
                  (sum, project) =>
                    sum + project.tasks.filter(task => task.status === 'Completed').length,
                  0
                ),
              ],
              [
                'Reviews Completed',
                projects.reduce((sum, project) => sum + project.risks.length, 0),
              ],
            ].map(([label, count]) => (
              <div className="panel activity-stat" key={String(label)}>
                <span>{label}</span>
                <b>{String(count)}</b>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="section-label">
            <div>
              <h2>Your Projects</h2>
              <span>Active workspaces you can launch right now</span>
            </div>
          </div>
          <div className="profile-projects">
            {projects.map(project => (
              <Link
                className="panel project-mini-card"
                to={`/project/${project.id}`}
                key={project.id}
              >
                <div>
                  <span className="eyebrow">{project.type}</span>
                  <h3>{project.name}</h3>
                  <span>Last updated: Today</span>
                </div>
                <div>
                  <AccountBadge>ACTIVE</AccountBadge>
                  <strong>{project.completion}%</strong>
                  <span>Complete</span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>

        <TechnologyFooter />
        {toast && (
          <div className="toast">
            <Check size={15} />
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

function PageHeaderSimple({ title, text }: { title: string; text: string }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">ACCOUNT & PREFERENCES</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="toggle-track" />
    </label>
  )
}

export function SettingsPage() {
  const { user, updatePreferences, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'security'>('appearance')
  const [passwordModal, setPasswordModal] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [toast, setToast] = useState('')

  // Password change modal state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  if (!user) return <Navigate to="/login" />

  const prefs = user.preferences

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const update = async (key: keyof UserPreferences, value: boolean) => {
    await updatePreferences({ [key]: value })
    showToast(`Notification setting updated.`)
  }

  const handleSelectTheme = async (themeName: 'dark' | 'slate' | 'midnight') => {
    await updatePreferences({ theme: themeName })
    document.documentElement.setAttribute('data-theme', themeName)
    showToast(`Theme switched to ${themeName === 'dark' ? 'Cyber Dark' : themeName === 'slate' ? 'Deep Slate' : 'Midnight Neon'}.`)
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordSuccess(true)
    setTimeout(() => {
      setPasswordSuccess(false)
      setPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password updated successfully.')
    }, 700)
  }

  return (
    <div className="account-page-wrap">
      <AccountNavbar title="Account Settings" />

      <div className="account-page">
        <PageHeaderSimple
          title="Account Settings"
          text="Control your workspace appearance, notifications, and security credentials."
        />

        <div className="settings-layout">
          <nav className="settings-nav">
            <button
              type="button"
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              <UserRound size={15} />
              Profile
            </button>
            <button
              type="button"
              className={activeTab === 'appearance' ? 'active' : ''}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette size={15} />
              Appearance
            </button>
            <button
              type="button"
              className={activeTab === 'notifications' ? 'active' : ''}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={15} />
              Notifications
            </button>
            <button
              type="button"
              className={activeTab === 'security' ? 'active' : ''}
              onClick={() => setActiveTab('security')}
            >
              <LockKeyhole size={15} />
              Security & API Keys
            </button>
          </nav>

          <div className="settings-content">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <section className="panel settings-section">
                <span className="eyebrow">PROFILE & IDENTITY</span>
                <h2>Workspace Identity</h2>
                <p>
                  Manage your personal details, academic role, and organizational affiliation.
                </p>

                <div className="profile-card" style={{ padding: '20px', marginBottom: '20px' }}>
                  <Avatar user={user} />
                  <div>
                    <strong style={{ fontSize: '15px' }}>{user.name}</strong>
                    <span style={{ display: 'block', color: 'var(--lime)', fontSize: '11px' }}>
                      {user.role}
                    </span>
                    <small style={{ color: 'var(--muted)' }}>{user.email}</small>
                  </div>
                  <Link className="btn btn-secondary" to="/profile">
                    Edit Profile <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="security-row">
                  <div>
                    <strong>Organization / College</strong>
                    <span>{user.organization || 'Independent developer'}</span>
                  </div>
                  <Link className="btn btn-secondary" to="/profile">
                    Change
                  </Link>
                </div>
              </section>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <section className="panel settings-section">
                <span className="eyebrow">APPEARANCE & THEME</span>
                <h2>Interface Styling</h2>
                <p>
                  Select your engineering workspace palette. All color themes maintain high-contrast
                  readability and cyber aesthetics.
                </p>

                <div className="theme-picker-grid">
                  <button
                    type="button"
                    className={`theme-card-option ${prefs.theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => handleSelectTheme('dark')}
                  >
                    <div className="theme-card-head">
                      <Moon size={18} />
                      {prefs.theme === 'dark' && <span className="badge badge-lime">ACTIVE</span>}
                    </div>
                    <strong>Cyber Dark (Default)</strong>
                    <span>Obsidian black background with vibrant electric lime highlights.</span>
                  </button>

                  <button
                    type="button"
                    className={`theme-card-option ${prefs.theme === 'slate' ? 'selected' : ''}`}
                    onClick={() => handleSelectTheme('slate')}
                  >
                    <div className="theme-card-head">
                      <Palette size={18} />
                      {prefs.theme === 'slate' && <span className="badge badge-lime">ACTIVE</span>}
                    </div>
                    <strong>Deep Slate</strong>
                    <span>Titanium blue-slate panels with cool aquamarine accents.</span>
                  </button>

                  <button
                    type="button"
                    className={`theme-card-option ${prefs.theme === 'midnight' ? 'selected' : ''}`}
                    onClick={() => handleSelectTheme('midnight')}
                  >
                    <div className="theme-card-head">
                      <Sparkles size={18} />
                      {prefs.theme === 'midnight' && <span className="badge badge-lime">ACTIVE</span>}
                    </div>
                    <strong>Midnight Neon</strong>
                    <span>Abyss deep navy with vivid laser green engineering accents.</span>
                  </button>
                </div>
              </section>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <section className="panel settings-section">
                <span className="eyebrow">NOTIFICATIONS & SIGNALS</span>
                <h2>Project Intelligence Alerts</h2>
                <p>
                  Fine-tune which events and autonomous agent discoveries trigger workspace
                  alerts.
                </p>

                <Toggle
                  label="Agent Review Completed"
                  description="Receive instant alerts when an agent finishes inspecting requirements or architecture."
                  checked={prefs.agentNotifications}
                  onChange={value => update('agentNotifications', value)}
                />
                <Toggle
                  label="Critical Risk Detected"
                  description="Immediately surface high-impact contradictions, missing states, or safety risks."
                  checked={prefs.riskAlerts}
                  onChange={value => update('riskAlerts', value)}
                />
                <Toggle
                  label="Task Recommendation"
                  description="Suggest next high-priority engineering tasks based on project completion."
                  checked={prefs.taskRecommendations}
                  onChange={value => update('taskRecommendations', value)}
                />
                <Toggle
                  label="Project Progress Updates"
                  description="Track meaningful changes to milestone completion and test validation."
                  checked={prefs.progressUpdates}
                  onChange={value => update('progressUpdates', value)}
                />
                <Toggle
                  label="Email Weekly Summary"
                  description="Send a condensed weekly report of agent activity and unresolved risks."
                  checked={prefs.emailNotifications}
                  onChange={value => update('emailNotifications', value)}
                />
              </section>
            )}

            {/* SECURITY & API KEYS TAB */}
            {activeTab === 'security' && (
              <section className="panel settings-section">
                <span className="eyebrow">SECURITY & ACCESS CREDENTIALS</span>
                <h2>Session & API Tokens</h2>
                <p>
                  Manage authentication credentials for external CI/CD pipelines, agent runners, and
                  your login password.
                </p>



                <div className="security-row">
                  <div>
                    <strong>Account Password</strong>
                    <span>Protected with local encrypted authentication token</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPasswordModal(true)}
                  >
                    Change Password
                  </button>
                </div>

                <div className="security-row">
                  <div>
                    <strong>Active Browser Session</strong>
                    <span>Chrome on Windows · Current device active</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirm(true)}
                  >
                    Sign Out
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Change Password Modal */}
        {passwordModal && (
          <div className="modal-backdrop">
            <div className="confirm-modal" role="dialog" aria-modal="true">
              <button
                type="button"
                className="modal-close"
                onClick={() => setPasswordModal(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
              <span className="icon-box">
                <ShieldCheck size={18} />
              </span>
              <h2>Change Account Password</h2>
              <p>Update your ProjectPilot credentials to keep your engineering workspaces secure.</p>

              <form onSubmit={handlePasswordSubmit} className="password-modal-form">
                <PasswordInput
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
                <PasswordInput
                  label="New Password (min 8 characters)"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />

                {passwordError && <span className="form-error">{passwordError}</span>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn" type="submit" disabled={passwordSuccess}>
                    {passwordSuccess ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sign Out Confirmation Modal */}
        {confirm && (
          <ConfirmModal
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              logout()
              navigate('/')
            }}
          />
        )}

        {toast && (
          <div className="toast">
            <Check size={15} />
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
