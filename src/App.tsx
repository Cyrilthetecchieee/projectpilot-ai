import { useEffect, useState, type ComponentType, type FormEvent } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, ArrowRight, BrainCircuit, Check, ChevronDown, ChevronRight, CircleAlert, CircleDot, ClipboardCheck, Cloud, Code2, Cpu, FileText, Hexagon, Key, LayoutDashboard, Menu, Network, Play, Plus, RefreshCw, Search, ShieldCheck, Sparkles, TestTube2, X } from 'lucide-react'
import { projectService } from './services/projectService'
import { agentService } from './services/agentService'
import type { Project, Risk, Task, TaskStatus } from './types'
import { AgentSimulationState, EngineState, TechnologyBadge, TechnologyFooter } from './components/TechnologyAttribution'
import { Avatar, LoginPage, ProfileMenu, ProfilePage, ProtectedRoute, SettingsPage, SignupPage } from './pages/AccountPages'
import { useAuth } from './context/AuthContext'
import { ApiKeysView } from './components/ApiKeysView'
import { InitializationPage } from './pages/InitializationPage'
import { EngineeringAgentsSection } from './components/EngineeringAgentsSection'
import { WorkspaceSearchModal } from './components/WorkspaceSearchModal'
import { TaskExecutionModal } from './components/TaskExecutionModal'
import './App.css'

const icons = { Overview: LayoutDashboard, Requirements: FileText, Architecture: Network, 'Execution Plan': ClipboardCheck, 'Risks & Gaps': CircleAlert, Testing: TestTube2, 'Agent Activity': Activity, 'API Keys': Key }
const routeNames: Record<string, string> = { Requirements: 'requirements', Architecture: 'architecture', 'Execution Plan': 'tasks', 'Risks & Gaps': 'risks', Testing: 'testing', 'Agent Activity': 'activity', 'API Keys': 'api-keys' }

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>
function RenderIcon({ icon, size = 17 }: { icon: unknown; size?: number }) { const IconComponent = icon as Icon; return <IconComponent size={size} /> }
const priorityLabel = (priority: string): Project['risks'][number]['severity'] => priority.charAt(0).toUpperCase() + priority.slice(1) as Project['risks'][number]['severity']

function Logo() { return <Link className="brand" to="/"><span className="brand-mark"><Hexagon size={18} /></span><span>ProjectPilot <b>AI</b></span></Link> }
function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: string }) { return <span className={`badge badge-${tone.toLowerCase().replace(/ /g, '-')}`}>{children}</span> }
function Button({ children, secondary = false, onClick, type = 'button', icon: Icon }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void; type?: 'button' | 'submit'; icon?: Icon }) { return <button type={type} className={`btn ${secondary ? 'btn-secondary' : ''}`} onClick={onClick}>{Icon && <Icon size={16} />}{children}</button> }
function Progress({ value }: { value: number }) { return <div className="progress"><span style={{ width: `${value}%` }} /></div> }
function Toast({ message, onClose }: { message: string; onClose: () => void }) { return <div className="toast"><Check size={16} />{message}<button onClick={onClose} aria-label="Close notification"><X size={14} /></button></div> }

function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  return <main className="landing"><header className="marketing-nav"><Logo /><nav><a href="#agents">How It Works</a><a href="#agents">Capabilities</a><a href="#workflow">Architecture</a></nav><div className="marketing-actions">{user ? <Button secondary onClick={() => navigate('/project/smart-helmet')}>Workspace</Button> : <Button secondary onClick={() => navigate('/login')}>Sign In</Button>}<Button onClick={() => navigate(user ? '/new-project' : '/signup')} icon={ArrowRight}>{user ? 'Launch Workspace' : 'Create Account'}</Button>{user && <Link to="/profile" className="nav-profile-badge" title="View Profile"><Avatar user={user} /></Link>}</div></header><section className="hero-section"><div className="hero-copy"><Badge tone="lime">AGENTIC ENGINEERING WORKSPACE</Badge><h1>Turn engineering ideas<br />into <em>executable projects.</em></h1><p>ProjectPilot analyzes requirements, designs system architecture, plans implementation, reviews engineering risks, and continuously identifies what your team should do next.</p><div className="hero-actions"><Button onClick={() => navigate('/new-project')} icon={Plus}>Create a Project</Button><Button secondary onClick={() => navigate('/project/smart-helmet')} icon={Play}>Explore Demo Project</Button></div><div className="hero-proof"><TechnologyBadge compact /></div></div><Preview /></section><EngineeringAgentsSection /><section className="section technology-section"><SectionIntro eyebrow="THE INTELLIGENCE BEHIND PROJECTPILOT" title="Built on an open AI stack designed for agentic engineering." /><div className="technology-cards"><TechnologyCard title="NVIDIA Nemotron" label="AI REASONING" icon={BrainCircuit} text="Powers ProjectPilot's specialized engineering agents for requirements analysis, architecture reasoning, project review, risk identification, planning, and verification." capabilities={['Requirement reasoning', 'Architecture analysis', 'Engineering review', 'Risk detection', 'Test generation']} /><TechnologyCard title="Nebius Token Factory" label="AI INFRASTRUCTURE" icon={Cloud} text="Provides the inference layer used by ProjectPilot to access NVIDIA Nemotron models and execute AI workflows." capabilities={['Model access', 'Inference', 'Agent requests', 'Scalable AI execution']} /></div><div className="technology-flow"><span>ProjectPilot</span><ChevronDown size={16} /><span>Agent Engine</span><ChevronDown size={16} /><span>Nebius Token Factory</span><ChevronDown size={16} /><span>NVIDIA Nemotron</span></div></section><section className="section workflow" id="workflow"><SectionIntro eyebrow="HOW IT WORKS" title="From raw thought to a buildable system." /><div className="workflow-line">{['IDEA', 'REQUIREMENTS', 'ARCHITECTURE', 'EXECUTION PLAN', 'REVIEW', 'VALIDATION'].map((step, i) => <div className="workflow-step" key={step}><span>0{i + 1}</span><b>{step}</b>{i < 5 && <ChevronRight className="workflow-arrow" size={18} />}</div>)}</div></section><section className="cta-band"><div><Badge tone="lime">READY WHEN YOU ARE</Badge><h2>Ready to turn an idea into an engineering plan?</h2></div><Button onClick={() => navigate('/new-project')} icon={ArrowRight}>Start a Project</Button></section><TechnologyFooter /></main>
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) { return <div className="section-intro"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div> }
function TechnologyCard({ title, label, text, capabilities, icon: Icon }: { title: string; label: string; text: string; capabilities: string[]; icon: Icon }) { return <article className="technology-card panel"><div className="technology-card-head"><span className="icon-box"><Icon size={20} /></span><div><span className="eyebrow">{label}</span><h3>{title}</h3></div></div><p>{text}</p><div className="capability-list">{capabilities.map(capability => <span key={capability}><Check size={12} />{capability}</span>)}</div><TechnologyBadge compact /></article> }
function WorkspaceProfile() { const { user, logout } = useAuth(); const navigate = useNavigate(); if (!user) return <Link className="avatar" to="/login">?</Link>; return <ProfileMenu user={user} onLogout={() => { logout(); navigate('/') }} /> }
function Preview() { return <div className="preview-wrap"><div className="preview-label"><span className="status-dot" />LIVE WORKSPACE PREVIEW</div><div className="preview"><div className="preview-top"><Logo /><span>•••</span></div><div className="preview-body"><aside><div className="preview-side-active"><LayoutDashboard size={13} /></div>{[FileText, Network, ClipboardCheck, CircleAlert, TestTube2].map((I, i) => <I key={i} size={14} />)}</aside><div className="preview-content"><div className="preview-heading"><div><small>PROJECT OVERVIEW</small><h3>Smart Helmet Safety System</h3></div><Badge tone="lime">ACTIVE</Badge></div><div className="preview-stat"><span>PROJECT COMPLETION</span><b>42%</b><Progress value={42} /></div><div className="preview-next"><small>NEXT RECOMMENDED ACTION</small><h4>Define sensor failure and fallback states</h4><div><Badge tone="high">HIGH</Badge><span>30–45 min</span></div></div><div className="preview-bars"><span /><span /><span /></div></div></div></div></div> }

function NewProject() { const navigate = useNavigate(); const [tech, setTech] = useState(['ESP32', 'React', 'Firebase']); const [value, setValue] = useState({ name: '', idea: '', objective: '', type: 'IoT / Embedded', constraints: '', timeline: '2–3 Months', stage: 'Idea' }); const [newTech, setNewTech] = useState(''); const submit = (e: FormEvent) => { e.preventDefault(); if (!value.name || !value.idea || !value.objective) return; const project = projectService.createProject({ ...value, technologies: tech }); navigate(`/project/${project.id}/initializing`) }; return <main className="onboarding"><header className="marketing-nav"><Logo /><span className="muted">NEW PROJECT <span className="slash">/</span> WORKSPACE SETUP</span><Link className="text-link" to="/">Cancel</Link></header><div className="form-wrap"><div className="form-heading"><Badge tone="lime">01 / PROJECT CONTEXT</Badge><h1>Let's understand<br />what you're building.</h1><p>Give ProjectPilot enough context to create your engineering workspace.</p></div><form onSubmit={submit} className="project-form"><label>Project Name<input required value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} placeholder="Smart Helmet Safety System" /></label><label>Project Idea / Problem<textarea required value={value.idea} onChange={e => setValue({ ...value, idea: e.target.value })} placeholder="Describe the engineering problem and the solution you want to build..." /></label><label>Primary Objective<textarea required value={value.objective} onChange={e => setValue({ ...value, objective: e.target.value })} placeholder="What must this project achieve?" /></label><div className="form-grid"><label>Project Type<select value={value.type} onChange={e => setValue({ ...value, type: e.target.value })}>{['IoT / Embedded', 'Web Application', 'Mobile Application', 'AI / ML', 'Automation', 'Robotics', 'Software System', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label><label>Timeline<select value={value.timeline} onChange={e => setValue({ ...value, timeline: e.target.value })}>{['1 Week', '2 Weeks', '1 Month', '2–3 Months', 'Custom'].map(x => <option key={x}>{x}</option>)}</select></label></div><label>Available Technologies<div className="chips">{tech.map(item => <span className="chip" key={item}>{item}<button type="button" onClick={() => setTech(tech.filter(x => x !== item))}>×</button></span>)}<input value={newTech} onChange={e => setNewTech(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTech) { e.preventDefault(); setTech([...tech, newTech]); setNewTech('') } }} placeholder="Add technology + Enter" /></div></label><label>Constraints<textarea value={value.constraints} onChange={e => setValue({ ...value, constraints: e.target.value })} placeholder="Limited hardware access, four-week timeline, student budget." /></label><label>Current Stage<select value={value.stage} onChange={e => setValue({ ...value, stage: e.target.value })}>{['Idea', 'Planning', 'Development', 'Testing', 'Almost Complete'].map(x => <option key={x}>{x}</option>)}</select></label><div className="form-actions"><Link className="btn btn-secondary" to="/">Cancel</Link><Button type="submit" icon={ArrowRight}>Create Project Workspace</Button></div></form></div></main> }

function ProjectShell({ children, project }: { children: React.ReactNode; project: Project }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="side-head"><Logo /><button className="icon-btn close-menu" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <div className="project-switcher"><span className="project-kicker">CURRENT PROJECT</span><strong>{project.name}</strong><span>{project.type}</span>{project.id === 'smart-helmet' && <Badge tone="lime">DEMO WORKSPACE</Badge>}</div>
        <nav className="side-nav">{Object.entries(icons).map(([label, I]) => { const route = label === 'Overview' ? '' : routeNames[label]; const href = `/project/${project.id}${route ? `/${route}` : ''}`; return <Link onClick={() => setOpen(false)} className={location.pathname === href || (label === 'Overview' && location.pathname === `/project/${project.id}`) ? 'active' : ''} to={href} key={label}><I size={17} />{label}</Link> })}</nav>
        <div className="side-footer"><EngineState /><button className="side-settings" onClick={() => navigate(`/project/${project.id}/api-keys`)}><Key size={15} />API Keys & Access</button><button className="back-home" onClick={() => navigate('/')}><ArrowRight size={15} />Exit workspace</button></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Projects</span><ChevronRight size={14} /><b>{project.name}</b></div>
          <div className="top-actions">
            <button
              type="button"
              className="search search-trigger-btn"
              onClick={() => setSearchOpen(true)}
              title="Search workspace (Cmd+K / Ctrl+K)"
              aria-label="Search workspace"
            >
              <Search size={15} />
              <span>Search workspace</span>
              <kbd>⌘ K</kbd>
            </button>
            <Button secondary icon={RefreshCw} onClick={() => navigate(`/project/${project.id}/risks`)}>Run Project Review</Button>
            <WorkspaceProfile />
          </div>
        </header>
        <main className="workspace-main">{children}</main>
      </div>

      <WorkspaceSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        project={project}
      />
    </div>
  );
}
function useProject() { const { id = 'smart-helmet' } = useParams(); const [project, setProject] = useState<Project | undefined>(() => projectService.getProject(id)); const refresh = () => setProject(projectService.getProject(id)); return { project, refresh } }
function PageHeader({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: React.ReactNode }) { return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div> }
function ProjectRoute() { const { project, refresh } = useProject(); const { id = 'smart-helmet' } = useParams(); const { isAuthenticated } = useAuth(); if (!isAuthenticated && id !== 'smart-helmet') return <Navigate to="/login" replace state={{ from: `/project/${id}` }} />; if (!project) return <Navigate to="/new-project" />; return <ProjectShell project={project}><Routes><Route path="initializing" element={<InitializationPage project={project} />} /><Route index element={<Dashboard project={project} refresh={refresh} />} /><Route path="requirements" element={<Requirements project={project} refresh={refresh} />} /><Route path="architecture" element={<Architecture project={project} refresh={refresh} />} /><Route path="tasks" element={<Tasks project={project} refresh={refresh} />} /><Route path="risks" element={<Risks project={project} refresh={refresh} />} /><Route path="testing" element={<Testing project={project} refresh={refresh} />} /><Route path="activity" element={<ActivityPage project={project} />} /><Route path="api-keys" element={<ApiKeysView project={project} />} /></Routes></ProjectShell> }
function Dashboard({ project, refresh }: { project: Project; refresh: () => void }) {
  const navigate = useNavigate();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const completed = project.tasks.filter(t => t.status === 'Completed').length;
  return (
    <>
      <PageHeader eyebrow="PROJECT OVERVIEW" title={project.name} text={`${project.type} · ${project.stage}`} action={<Badge tone="lime">ACTIVE</Badge>} />
      <div className="overview-grid">
        <div className="completion-card panel">
          <div>
            <span className="eyebrow">PROJECT COMPLETION</span>
            <strong>{project.completion}%</strong>
          </div>
          <Progress value={project.completion} />
          <div className="completion-meta">
            <span>{completed} of {project.tasks.length} tasks complete</span>
            <span>Updated just now</span>
          </div>
        </div>
        <NextAction project={project} onStartTask={() => setTaskModalOpen(true)} />
      </div>
      <div className="section-label">
        <div>
          <h2>Your AI Engineering Team</h2>
          <span>AI reasoning powered by NVIDIA Nemotron</span>
        </div>
        <TechnologyBadge compact />
      </div>
      <div className="metric-grid">
        {[
          ['Requirements', `${project.requirements.length} Defined`, '2 Need Review', '/requirements', FileText],
          ['Architecture', `${project.architecture.length} Components`, '1 Interface Gap', '/architecture', Network],
          ['Tasks', `${completed} / ${project.tasks.length} Complete`, '4 In Progress', '/tasks', ClipboardCheck],
          ['Open Risks', `${project.risks.filter(r => !r.resolved).length}`, '1 Critical', '/risks', CircleAlert],
          ['Test Coverage', `${project.tests.length} Cases`, `${project.tests.filter(t => t.status === 'Pending').length} Pending`, '/testing', TestTube2],
          ['API Keys', 'Credentials Active', 'Manage Scopes', '/api-keys', Key],
        ].map(([label, main, sub, path, I]) => (
          <button className="metric-card" key={String(label)} onClick={() => navigate(`/project/${project.id}${String(path)}`)}>
            <span className="metric-icon"><RenderIcon icon={I} /></span>
            <small>{String(label)}</small>
            <b>{String(main)}</b>
            <span>{String(sub)}</span>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
      <div className="split-grid">
        <div>
          <div className="team-list">
            {[
              ['Requirement Agent', 'Complete', FileText],
              ['Architecture Agent', 'Complete', Network],
              ['Planner Agent', 'Active', ClipboardCheck],
              ['Reviewer Agent', 'Attention Required', ShieldCheck],
              ['Test Agent', 'Ready', TestTube2],
            ].map(([name, status, I]) => (
              <div className="team-row" key={String(name)}>
                <span className="icon-box small"><RenderIcon icon={I} size={16} /></span>
                <b>{String(name)}</b>
                <Badge tone={String(status).includes('Attention') ? 'high' : String(status).toLowerCase()}>{String(status)}</Badge>
              </div>
            ))}
          </div>
          <span className="inference-caption">Inference via Nebius Token Factory</span>
        </div>
        <Findings project={project} />
      </div>
      <TaskExecutionModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        project={project}
        refresh={refresh}
      />
    </>
  );
}

function NextAction({ project, onStartTask }: { project: Project; onStartTask: () => void }) {
  const matchedTask = project.tasks.find(
    t =>
      t.id === 'T-04' ||
      t.title.toLowerCase().includes('fallback') ||
      t.title.toLowerCase() === project.nextAction.title.toLowerCase()
  );
  const status = matchedTask?.status || 'Pending';
  const isInProgress = status === 'In Progress';
  const isCompleted = status === 'Completed';

  return (
    <div className={`next-action ${isInProgress ? 'next-action-in-progress' : ''}`}>
      <div className="next-action-top">
        <span className="eyebrow"><Sparkles size={13} /> NEXT RECOMMENDED ACTION</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {isInProgress && (
            <span className="task-status-pill status-in-progress" style={{ fontSize: '9px', padding: '2px 7px' }}>
              ● IN PROGRESS
            </span>
          )}
          {isCompleted && (
            <span className="task-status-pill status-completed" style={{ fontSize: '9px', padding: '2px 7px' }}>
              ✓ COMPLETED
            </span>
          )}
          <Badge tone={project.nextAction.priority === 'Critical' ? 'critical' : 'high'}>
            {project.nextAction.priority}
          </Badge>
        </div>
      </div>
      <h2>{project.nextAction.title}</h2>
      <p>{project.nextAction.description}</p>
      <div className="criteria">
        <strong>SUCCESS CRITERIA</strong>
        {project.nextAction.criteria.map(x => (
          <span key={x}><Check size={13} />{x}</span>
        ))}
      </div>
      <Button
        icon={isCompleted ? Check : isInProgress ? Play : ArrowRight}
        onClick={onStartTask}
      >
        {isCompleted ? (
          'Task Completed · View Details'
        ) : isInProgress ? (
          <>
            <span className="live-pulse" /> Continue Task <span className="effort">{project.nextAction.effort}</span>
          </>
        ) : (
          <>
            Start Task <span className="effort">{project.nextAction.effort}</span>
          </>
        )}
      </Button>
    </div>
  );
}
function Findings({ project }: { project: Project }) { return <div><div className="section-label"><h2>Recent Agent Findings</h2><Link to={`/project/${project.id}/risks`}>View all <ArrowRight size={14} /></Link></div><div className="findings">{project.risks.slice(0, 3).map(r => <Link className="finding" to={`/project/${project.id}/risks`} key={r.id}><Badge tone={r.severity}>{r.severity}</Badge><div><b>{r.title}</b><span>{r.severity === 'Critical' ? 'Reviewer Agent' : r.severity === 'High' ? 'Architecture Agent' : 'Test Agent'} · 2 minutes ago</span></div><ArrowRight size={15} /></Link>)}</div></div> }

function Requirements({ project, refresh }: { project: Project; refresh: () => void }) { const [running, setRunning] = useState(false); const [toast, setToast] = useState(''); const [error, setError] = useState(''); const analyze = async () => { setRunning(true); setError(''); try { const result = await agentService.analyzeRequirements(project); const current = projectService.getProject(project.id)!; projectService.saveProject({ ...current, requirements: result.requirements, requirementProblem: result.analysis.problem, requirementConstraints: result.analysis.constraints, assumptions: result.analysis.assumptions, openQuestions: result.analysis.open_questions, activity: [{ id: `a-${Date.now()}`, agent: 'Requirement Agent', action: 'Analyze Requirements', status: 'Completed', duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`, createdAt: 'Just now', provider: result.analysis.provider, model: result.analysis.model, summary: result.analysis.summary }, ...current.activity] }); setToast('Requirement analysis completed.'); refresh() } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Requirement analysis could not be completed.') } finally { setRunning(false) } }; return <><PageHeader eyebrow="PROJECT INTELLIGENCE" title="Requirements" text="Structured understanding of what the system must accomplish." action={<Button onClick={analyze} icon={running ? RefreshCw : Sparkles}>{running ? 'Analyzing...' : 'Analyze Requirements'}</Button>} />{running && <AgentProgress realProvider title="Requirement Agent is analyzing your project..." steps={['Sending project context to FastAPI...', 'Nemotron is structuring requirements...', 'Validating Pydantic response...', 'Saving engineering artifacts...']} />}{error && <div className="agent-error panel"><strong>Requirement Agent could not complete the analysis.</strong><span>{error}</span><button className="btn btn-secondary" onClick={analyze}>Retry</button></div>}{!running && <div className="panel table-panel">{project.requirementProblem && <div className="requirement-problem"><span className="eyebrow">PROBLEM INTERPRETATION</span><p>{project.requirementProblem}</p></div>}<div className="table-heading"><div><h2>Functional Requirements</h2><span>What the system must do</span></div><Button secondary icon={Plus}>Add Requirement</Button></div><RequirementTable project={project} refresh={refresh} kind="Functional" /><div className="table-heading subheading"><div><h2>Non-functional Requirements</h2><span>Quality, safety and operational constraints</span></div></div><RequirementTable project={project} refresh={refresh} kind="Non-functional" /><div className="notes-grid"><div><span className="eyebrow">CONSTRAINTS</span><p>{project.requirementConstraints?.join(' · ') || project.constraints || 'No constraints recorded.'}</p></div><div><span className="eyebrow">ASSUMPTIONS</span><p>{project.assumptions?.join(' · ') || 'No assumptions recorded.'}</p></div><div><span className="eyebrow">OPEN QUESTIONS</span><p>{project.openQuestions?.join(' · ') || 'No open questions recorded.'}</p></div></div></div>}{toast && <Toast message={toast} onClose={() => setToast('')} />}</> }
function RequirementTable({ project, refresh, kind }: { project: Project; refresh: () => void; kind: 'Functional' | 'Non-functional' }) { return <div className="req-list">{project.requirements.filter(r => r.kind === kind).map(r => <div className="req-row" key={r.id}><b>{r.id}</b><span>{r.text}</span><Badge tone={r.priority}>{r.priority}</Badge><select value={r.status} onChange={e => { projectService.updateRequirement(r.id, { status: e.target.value as any }, project.id); refresh() }}><option>Validated</option><option>Needs review</option><option>Draft</option></select><button aria-label={`Delete ${r.id}`}><X size={15} /></button></div>)}</div> }
function AgentProgress({ title, steps, realProvider = false, agentName }: { title: string; steps: string[]; realProvider?: boolean; agentName?: string }) { const name = agentName || title.replace(' is analyzing your project...', '').replace(' is designing your project...', '').replace(' is inspecting your project...', '').replace(' is building your execution plan...', ''); return <div className="agent-progress panel">{realProvider ? <div className="simulation-state"><span className="running-icon"><BrainCircuit size={18} /></span><div><strong>{name}</strong><span>Powered by NVIDIA Nemotron</span></div></div> : <AgentSimulationState agent={name} />}<div><p>Working through the project memory and engineering context.</p>{steps.map((step, i) => <div className="progress-step" key={step}><span className={i < 2 ? 'step-done' : ''}>{i < 2 ? <Check size={12} /> : <CircleDot size={12} />}</span>{step}</div>)}</div></div> }

function Architecture({ project, refresh }: { project: Project; refresh: () => void }) { const [running, setRunning] = useState(false); const [error, setError] = useState(''); const [toast, setToast] = useState(''); const generate = async () => { setRunning(true); setError(''); try { const result = await agentService.generateArchitecture(project); const current = projectService.getProject(project.id)!; projectService.saveProject({ ...current, architecture: result.architecture, architectureConnections: result.analysis.connections, architectureDataFlow: result.analysis.data_flow, architectureDecisions: result.analysis.architecture_decisions, architectureGaps: result.analysis.architecture_gaps.map(gap => ({ title: gap.title, severity: priorityLabel(gap.severity), reason: gap.reason, recommendedAction: gap.recommended_action })), activity: [{ id: `a-${Date.now()}`, agent: 'Architecture Agent', action: 'Generate Architecture', status: 'Completed', duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`, createdAt: 'Just now', provider: result.analysis.provider, model: result.analysis.model, summary: `${result.architecture.length} components generated` }, ...current.activity] }); setToast('Architecture generated from validated requirements.'); refresh() } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Architecture generation could not be completed.') } finally { setRunning(false) } }; const connections = project.architectureConnections || []; const first = project.architecture[0]; return <><PageHeader eyebrow="SYSTEM DESIGN" title="System Architecture" text="Visual representation of components and data flow." action={<Button onClick={generate} icon={running ? RefreshCw : Sparkles}>{running ? 'Designing...' : 'Generate Architecture'}</Button>} />{running && <AgentProgress realProvider title="Architecture Agent is designing your project..." steps={['Loading persisted requirements...', 'Nemotron is mapping system components...', 'Validating interfaces and traceability...', 'Saving architecture artifacts...']} />}{error && <div className="agent-error panel"><strong>Architecture Agent could not complete the analysis.</strong><span>{error}</span><button className="btn btn-secondary" onClick={generate}>Retry</button></div>}{!running && <><div className="architecture-layout"><div className="panel diagram-panel"><div className="panel-heading"><div><h2>System Components</h2><span>{connections.length} connections · generated from requirements</span></div><Badge tone="lime">{project.architecture.length ? 'GENERATED' : 'NOT GENERATED'}</Badge></div>{project.architecture.length ? <div className="diagram">{project.architecture.map((node, i) => <div className="diagram-item" key={node.id}><div className="architecture-node"><span className="node-index">{String(i + 1).padStart(2, '0')}</span><div><b>{node.name}</b><span>{node.technology || node.type || node.status}</span></div><ChevronRight size={17} /></div>{i < project.architecture.length - 1 && <div className="connector"><span /></div>}</div>)}</div> : <EmptyArchitecture onGenerate={generate} />}</div><div className="side-stack"><div className="panel"><div className="panel-heading"><h2>Component details</h2><Code2 size={17} /></div>{first ? <div className="component-detail"><span className="icon-box"><Cpu size={18} /></span><h3>{first.name}</h3><Badge tone="lime">{first.status}</Badge><small>RESPONSIBILITY</small><p>{first.responsibility}</p><small>INPUTS</small><div className="tag-list">{first.inputs.map(input => <span key={input}>{input}</span>)}</div><small>OUTPUTS</small><div className="tag-list">{first.outputs.map(output => <span key={output}>{output}</span>)}</div></div> : <p className="architecture-empty-copy">Generate architecture to inspect the first system component.</p>}</div><div className="panel"><span className="eyebrow">ARCHITECTURE GAPS</span>{project.architectureGaps?.length ? project.architectureGaps.map(gap => <div className="architecture-gap" key={gap.title}><h3>{gap.title}</h3><p>{gap.reason}</p><Badge tone={gap.severity}>{gap.severity}</Badge><small>{gap.recommendedAction}</small></div>) : <p className="architecture-empty-copy">No architecture gaps recorded yet.</p>}</div></div></div><div className="architecture-detail-grid"><ArchitectureConnections connections={connections} components={project.architecture} /><div className="panel detail-panel"><span className="eyebrow">DATA FLOW</span>{(project.architectureDataFlow || []).map(flow => <div className="flow-row" key={flow.step}><b>{String(flow.step).padStart(2, '0')}</b><span>{flow.description}</span></div>)}<span className="eyebrow detail-eyebrow">ARCHITECTURE DECISIONS</span>{(project.architectureDecisions || []).map(decision => <div className="decision-row" key={decision.decision}><b>{decision.decision}</b><span>{decision.reason}</span></div>)}</div></div></>}{toast && <Toast message={toast} onClose={() => setToast('')} />}</> }
function EmptyArchitecture({ onGenerate }: { onGenerate: () => void }) { return <div className="architecture-empty"><Network size={24} /><h3>No architecture generated yet.</h3><p>Let the Architecture Agent translate the validated requirements into components and interfaces.</p><Button onClick={onGenerate} icon={Sparkles}>Generate Architecture</Button></div> }
function ArchitectureConnections({ connections, components }: { connections: { source: string; target: string; interface: string; protocol: string; data: string; description: string }[]; components: Project['architecture'] }) { const label = (id: string) => components.find(component => component.id === id)?.name || id; return <div className="panel detail-panel"><div className="panel-heading"><div><span className="eyebrow">CONNECTIONS & INTERFACES</span><span>Traceable system boundaries</span></div><Network size={17} /></div>{connections.length ? connections.map(connection => <div className="connection-row" key={`${connection.source}-${connection.target}`}><div><b>{label(connection.source)}</b><ChevronRight size={14} /><b>{label(connection.target)}</b></div><span>{connection.interface || connection.protocol || 'Interface pending'} · {connection.data}</span><p>{connection.description}</p></div>) : <p className="architecture-empty-copy">No connections returned yet.</p>}</div> }
function Tasks({ project, refresh }: { project: Project; refresh: () => void }) { const [running, setRunning] = useState(false); const [error, setError] = useState(''); const [toast, setToast] = useState(''); const [selectedTask, setSelectedTask] = useState<Task | null>(null); const generate = async () => { setRunning(true); setError(''); try { const result = await agentService.generatePlan(project); const current = projectService.getProject(project.id)!; projectService.saveProject({ ...current, tasks: result.tasks, milestones: result.milestones, plannerSummary: result.analysis.summary, planningNotes: result.analysis.planning_notes, criticalPath: result.analysis.critical_path, activity: [{ id: `a-${Date.now()}`, agent: 'Planner Agent', action: 'Generate Execution Plan', status: 'Completed', duration: `${(result.analysis.duration_ms / 1000).toFixed(1)}s`, createdAt: 'Just now', provider: result.analysis.provider, model: result.analysis.model, summary: `${result.milestones.length} milestones, ${result.tasks.length} tasks planned` }, ...current.activity] }); setToast('Execution plan generated from requirements and architecture.'); refresh() } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Execution plan could not be generated.') } finally { setRunning(false) } }; const groups = [...new Set(project.tasks.map(t => t.milestone))]; return <><PageHeader eyebrow="EXECUTION" title="Execution Plan" text="Milestones and tasks that turn the design into a working system." action={<Button onClick={generate} icon={running ? RefreshCw : Sparkles}>{running ? 'Planning...' : 'Generate Execution Plan'}</Button>} />{running && <AgentProgress realProvider agentName="Planner Agent" title="Planner Agent is building your execution plan..." steps={['Loading persisted requirements and architecture...', 'Nemotron is generating dependency-aware tasks...', 'Validating milestone and task references...', 'Saving execution plan artifacts...']} />}{error && <div className="agent-error panel"><strong>Planner Agent could not generate the execution plan.</strong><span>{error}</span><button className="btn btn-secondary" onClick={generate}>Retry</button></div>}{!running && <>{project.plannerSummary && <div className="panel" style={{ marginBottom: '1rem' }}><span className="eyebrow">EXECUTION PLAN SUMMARY</span><p>{project.plannerSummary}</p></div>}<div className="metrics-strip"><span><b>{project.tasks.length}</b> Tasks</span><span><b>{project.tasks.filter(t => t.status === 'Completed').length}</b> Completed</span><span><b>{project.tasks.filter(t => t.status === 'In Progress').length}</b> In Progress</span><span><b>{project.tasks.filter(t => t.status === 'Pending').length}</b> Pending</span>{project.criticalPath && <span><b>{project.criticalPath.length}</b> Critical Path</span>}</div><div className="milestones">{groups.map((group, i) => <div className="milestone panel" key={group}><div className="milestone-head"><div><span className="milestone-number">0{i + 1}</span><div><h2>{group}</h2><span>{project.tasks.filter(t => t.milestone === group && t.status === 'Completed').length} of {project.tasks.filter(t => t.milestone === group).length} complete</span></div></div><Progress value={project.tasks.filter(t => t.milestone === group && t.status === 'Completed').length / project.tasks.filter(t => t.milestone === group).length * 100} /></div>{project.tasks.filter(t => t.milestone === group).map(task => <div className={`task-row${task.isCriticalPath ? ' critical-path' : ''}`} key={task.id} style={task.isCriticalPath ? { borderLeft: '3px solid var(--lime, #a3e635)' } : undefined}><span className={`task-check ${task.status === 'Completed' ? 'checked' : ''}`}>{task.status === 'Completed' && <Check size={13} />}</span><div><b>{task.title}</b>{task.estimatedEffort && <span className="badge badge-default" style={{ marginLeft: 6, fontSize: '0.7rem' }}>{task.estimatedEffort}</span>}{task.isCriticalPath && <span className="badge badge-lime" style={{ marginLeft: 6, fontSize: '0.7rem' }}>CRITICAL PATH</span>}<span>{task.id}{task.successCriteriaList?.length ? ` · ${task.successCriteriaList[0]}` : task.successCriteria ? ` · ${task.successCriteria}` : ''}</span>{task.dependencies && task.dependencies.length > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--muted, #888)' }}>Depends on: {task.dependencies.join(', ')}</span>}{task.relatedRequirements && task.relatedRequirements.length > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--muted, #888)' }}>Requirements: {task.relatedRequirements.join(', ')}</span>}{task.relatedComponents && task.relatedComponents.length > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--muted, #888)' }}>Components: {task.relatedComponents.join(', ')}</span>}</div><button type="button" className="btn-run-task" title="Open Task Runner" onClick={() => setSelectedTask(task)} style={{ background: 'transparent', border: '1px solid #23433b', borderRadius: '4px', color: 'var(--lime)', padding: '5px 9px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', whiteSpace: 'nowrap' }}><Play size={11} /> {task.status === 'Completed' ? 'Review' : task.status === 'In Progress' ? 'Resume' : 'Start'}</button><Badge tone={task.priority}>{task.priority}</Badge><select value={task.status} onChange={e => { projectService.updateTask(task.id, { status: e.target.value as TaskStatus }, project.id); refresh() }}><option>Pending</option><option>In Progress</option><option>Completed</option></select></div>)}</div>)}</div>{project.planningNotes && project.planningNotes.length > 0 && <div className="panel" style={{ marginTop: '1rem' }}><span className="eyebrow">PLANNING NOTES</span>{project.planningNotes.map((note, i) => <p key={i} style={{ margin: '0.4rem 0', fontSize: '0.85rem' }}>{note}</p>)}</div>}</>}{selectedTask && <TaskExecutionModal isOpen={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} project={project} refresh={refresh} targetTask={selectedTask} />}{toast && <Toast message={toast} onClose={() => setToast('')} />}</> }
function Risks({ project, refresh }: { project: Project; refresh: () => void }) { const [running, setRunning] = useState(false); const [toast, setToast] = useState(''); const [filter, setFilter] = useState('All'); const review = async () => { setRunning(true); await new Promise(r => setTimeout(r, 1500)); projectService.addActivity({ id: `a-${Date.now()}`, agent: 'Reviewer Agent', action: 'Detected 4 engineering gaps', status: 'Completed', duration: '3.1s', createdAt: 'Just now' }, project.id); setRunning(false); setToast('Project review completed.'); refresh() }; const visible = project.risks.filter(r => filter === 'All' || filter === 'Resolved' ? (filter === 'Resolved' ? r.resolved : true) : r.severity === filter); return <><PageHeader eyebrow="CONTINUOUS REVIEW" title="Engineering Review" text="ProjectPilot continuously reviews your project for unresolved risks, assumptions and design gaps." action={<Button onClick={review} icon={RefreshCw}>Run Project Review</Button>} />{running ? <AgentProgress title="Reviewer Agent is inspecting your project..." steps={['Requirements', 'Architecture', 'Execution Plan', 'Test Coverage']} /> : <><div className="filter-row">{['All', 'Critical', 'High', 'Medium', 'Resolved'].map(x => <button className={filter === x ? 'selected' : ''} onClick={() => setFilter(x)} key={x}>{x}</button>)}</div><div className="risk-list">{visible.map(r => <RiskCard key={r.id} risk={r} project={project} refresh={refresh} setToast={setToast} />)}</div></>}{toast && <Toast message={toast} onClose={() => setToast('')} />}</> }
function RiskCard({ risk, project, refresh, setToast }: { risk: Risk; project: Project; refresh: () => void; setToast: (x: string) => void }) { const [creating, setCreating] = useState(false); const createTask = async () => { setCreating(true); const task = await agentService.createTaskFromFinding(project.id, risk); projectService.addTask(task, project.id); projectService.addActivity({ id: `a-${Date.now()}`, agent: 'Planner Agent', action: `Created task from ${risk.title}`, status: 'Completed', duration: '1.2s', createdAt: 'Just now' }, project.id); setCreating(false); setToast('Task added to the execution plan.'); refresh() }; return <div className={`risk-card panel ${risk.severity.toLowerCase()}`}><div className="risk-top"><Badge tone={risk.severity}>{risk.severity}</Badge>{risk.resolved ? <Badge tone="lime">RESOLVED</Badge> : <span>Reviewer Agent · Today</span>}</div><h2>{risk.title}</h2><p>{risk.detail}</p><div className="recommendation"><span className="eyebrow">RECOMMENDED ACTION</span><p>{risk.recommendation}</p></div><div className="risk-actions">{!risk.resolved && <Button onClick={createTask} icon={creating ? RefreshCw : Plus}>{creating ? 'Creating...' : 'Create Task from Finding'}</Button>}<Button secondary onClick={() => { const p = projectService.getProject(project.id)!; projectService.saveProject({ ...p, risks: p.risks.map(x => x.id === risk.id ? { ...x, resolved: !x.resolved } : x) }); refresh() }}>{risk.resolved ? 'Reopen' : 'Mark resolved'}</Button></div></div> }
function Testing({ project, refresh }: { project: Project; refresh: () => void }) { return <><PageHeader eyebrow="VALIDATION" title="Verification & Testing" text="Measurable scenarios that prove the system behaves safely." action={<Button icon={Sparkles}>Generate Test Cases</Button>} /><div className="metrics-strip"><span><b>{project.tests.length}</b> Total Tests</span><span><b>{project.tests.filter(t => t.status === 'Passed').length}</b> Passed</span><span><b>{project.tests.filter(t => t.status === 'Pending').length}</b> Pending</span><span><b>{project.tests.filter(t => t.status === 'Failed').length}</b> Failed</span></div><div className="panel table-panel test-table"><div className="test-head"><span>ID</span><span>SCENARIO</span><span>PRECONDITION</span><span>EXPECTED RESULT</span><span>STATUS</span></div>{project.tests.map(test => <div className="test-row" key={test.id}><b>{test.id}</b><span>{test.scenario}</span><span>{test.precondition}</span><span>{test.expected}</span><select value={test.status} onChange={e => { projectService.updateTestCase(test.id, { status: e.target.value as any }, project.id); refresh() }}><option>Pending</option><option>Passed</option><option>Failed</option></select></div>)}</div></> }
function ActivityPage({ project }: { project: Project }) { return <><PageHeader eyebrow="PROJECT MEMORY" title="Agent Activity" text="Trace how ProjectPilot is analyzing and evolving this project." /><div className="metrics-strip"><span><b>5</b> Agents</span><span><b>{project.activity.length + 13}</b> Runs</span><span><b>{project.activity.filter(a => a.status === 'Completed').length + 12}</b> Successful</span><span><b>1</b> Needs Attention</span></div><div className="panel activity-list"><div className="activity-table-head"><span>AGENT</span><span>ACTION</span><span>MODEL</span><span>PROVIDER</span><span>STATUS</span><span>DURATION</span><span>TIME</span></div>{project.activity.map((run, i) => <div className="activity-row" key={run.id}><div className="activity-line"><span className="activity-dot"><Check size={13} /></span>{i < project.activity.length - 1 && <span className="line" />}</div><div><b>{run.agent}</b></div><p>{run.action}</p><span className="activity-meta">{run.model || 'Simulation'}</span><span className="activity-meta">{run.provider || 'Local Mock'}</span><Badge tone="lime">{run.status}</Badge><span className="duration">{run.duration}</span><span className="activity-meta">{run.createdAt}</span></div>)}</div></> }

function App() { return <BrowserRouter><Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/new-project" element={<ProtectedRoute><NewProject /></ProtectedRoute>} /><Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /><Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} /><Route path="/project/:id/*" element={<ProjectRoute />} /><Route path="*" element={<Navigate to="/" />} /></Routes></BrowserRouter> }
export default App
