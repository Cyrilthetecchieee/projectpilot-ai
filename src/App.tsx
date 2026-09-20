import { useEffect, useState, type ComponentType, type FormEvent } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, ArrowRight, ArrowUp, BrainCircuit, Check, ChevronDown, ChevronRight, CircleAlert, ClipboardCheck, Cloud, Cpu, FileText, Hexagon, Info, Key, LayoutDashboard, Menu, Network, Play, Plus, RefreshCw, Search, ShieldCheck, TestTube2, X } from 'lucide-react'
import { projectService } from './services/projectService'
import type { Project } from './types'
import { EngineState, TechnologyBadge, TechnologyFooter } from './components/TechnologyAttribution'
import { Avatar, LoginPage, ProfileMenu, ProfilePage, ProtectedRoute, SettingsPage, SignupPage } from './pages/AccountPages'
import { useAuth } from './context/AuthContext'
import { ApiKeysView } from './components/ApiKeysView'
import { InitializationPage } from './pages/InitializationPage'
import { EngineeringAgentsSection } from './components/EngineeringAgentsSection'
import { WorkspaceSearchModal } from './components/WorkspaceSearchModal'
import { ExecutionPlanView } from './components/ExecutionPlanView'
import { AgentActivityView } from './components/AgentActivityView'
import { RequirementsView } from './components/RequirementsView'
import { ArchitectureView } from './components/ArchitectureView'
import { RisksView } from './components/RisksView'
import { TestingView } from './components/TestingView'
import { OverviewView } from './components/OverviewView'
import { ProjectDetailsModal } from './components/ProjectDetailsModal'
import './App.css'

const icons = { Overview: LayoutDashboard, Requirements: FileText, Architecture: Network, 'Execution Plan': ClipboardCheck, 'Risks & Gaps': CircleAlert, Testing: TestTube2, 'Agent Activity': Activity, 'API Keys': Key }
const routeNames: Record<string, string> = { Requirements: 'requirements', Architecture: 'architecture', 'Execution Plan': 'tasks', 'Risks & Gaps': 'risks', Testing: 'testing', 'Agent Activity': 'activity', 'API Keys': 'api-keys' }

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>

function Logo() { return <Link className="brand" to="/"><span className="brand-mark"><Hexagon size={18} /></span><span>ProjectPilot <b>AI</b></span></Link> }
function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: string }) { return <span className={`badge badge-${tone.toLowerCase().replace(/ /g, '-')}`}>{children}</span> }
function Button({ children, secondary = false, onClick, type = 'button', icon: Icon }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void; type?: 'button' | 'submit'; icon?: Icon }) { return <button type={type} className={`btn ${secondary ? 'btn-secondary' : ''}`} onClick={onClick}>{Icon && <Icon size={16} />}{children}</button> }
function Progress({ value }: { value: number }) { return <div className="progress"><span style={{ width: `${value}%` }} /></div> }

function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  return (
    <main className="landing">
      <header className="marketing-nav">
        <Logo />
        <nav>
          <a href="#agents">Agents</a>
          <a href="#agents">Capabilities</a>
          <a href="#workflow">Architecture</a>
        </nav>
        <div className="marketing-actions">
          {user ? <Button secondary onClick={() => navigate('/project/smart-helmet')}>Workspace</Button> : <Button secondary onClick={() => navigate('/login')}>Sign In</Button>}
          <Button onClick={() => navigate(user ? '/new-project' : '/signup')} icon={ArrowRight}>
            {user ? 'Launch Workspace' : 'Create Account'}
          </Button>
          {user && <Link to="/profile" className="nav-profile-badge" title="View Profile"><Avatar user={user} /></Link>}
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <h1>Turn engineering ideas<br />into <em>executable projects.</em></h1>
          <p>ProjectPilot analyzes requirements, designs system architecture, plans implementation, reviews engineering risks, and continuously identifies what your team should do next.</p>
          <div className="hero-actions">
            <Button onClick={() => navigate('/new-project')} icon={Plus}>Create a Project</Button>
            <Button secondary onClick={() => navigate('/project/smart-helmet')} icon={Play}>Explore Demo Project</Button>
          </div>
        </div>
        <Preview />
      </section>

      <EngineeringAgentsSection />

      <section className="section technology-section">
        <SectionIntro title="Built on an open AI stack designed for agentic engineering." />
        <div className="technology-cards">
          <TechnologyCard title="NVIDIA Nemotron" label="AI REASONING" icon={BrainCircuit} text="Powers ProjectPilot's specialized engineering agents for requirements analysis, architecture reasoning, project review, risk identification, planning, and verification." capabilities={['Requirement reasoning', 'Architecture analysis', 'Engineering review', 'Risk detection', 'Test generation']} />
          <TechnologyCard title="Nebius Token Factory" label="AI INFRASTRUCTURE" icon={Cloud} text="Provides the inference layer used by ProjectPilot to access NVIDIA Nemotron models and execute AI workflows." capabilities={['Model access', 'Inference', 'Agent requests', 'Scalable AI execution']} />
        </div>
        <div className="technology-flow">
          <span>ProjectPilot</span>
          <ChevronDown size={16} />
          <span>Agent Engine</span>
          <ChevronDown size={16} />
          <span>Nebius Token Factory</span>
          <ChevronDown size={16} />
          <span>NVIDIA Nemotron</span>
        </div>
      </section>

      <section className="section workflow" id="workflow">
        <SectionIntro title="From raw thought to a buildable system." />
        <div className="workflow-line">
          {['IDEA', 'REQUIREMENTS', 'ARCHITECTURE', 'EXECUTION PLAN', 'REVIEW', 'VALIDATION'].map((step, i) => (
            <div className="workflow-step" key={step}>
              <span>0{i + 1}</span>
              <b>{step}</b>
              {i < 5 && <ChevronRight className="workflow-arrow" size={18} />}
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div className="cta-content">
          <h2 className="cta-title">Ready to turn an idea into an engineering plan?</h2>
          <p className="cta-desc">
            Synthesize complete system architectures, phased execution roadmaps, automated verification scenarios,
            and real-time engineering risk registries in minutes.
          </p>
          <div className="cta-chips">
            <span className="cta-chip"><BrainCircuit size={13} /> Architecture Reasoning</span>
            <span className="cta-chip"><ShieldCheck size={13} /> Automated Risk Radar</span>
            <span className="cta-chip"><Cpu size={13} /> Multi-Agent Engine</span>
          </div>
        </div>
        <div className="cta-actions">
          <button
            type="button"
            className="cta-primary-btn"
            onClick={() => navigate(user ? '/new-project' : '/signup')}
          >
            <span>{user ? 'Launch New Project' : 'Start a Project'}</span>
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="cta-demo-btn"
            onClick={() => navigate('/project/smart-helmet')}
          >
            <Play size={13} />
            <span>Explore Demo Workspace</span>
          </button>
        </div>
      </section>

      <TechnologyFooter />
    </main>
  )
}

function SectionIntro({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) { return <div className="section-intro">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{text && <p>{text}</p>}</div> }
function TechnologyCard({ title, label, text, capabilities, icon: Icon }: { title: string; label: string; text: string; capabilities: string[]; icon: Icon }) { return <article className="technology-card panel"><div className="technology-card-head"><span className="icon-box"><Icon size={20} /></span><div><span className="eyebrow">{label}</span><h3>{title}</h3></div></div><p>{text}</p><div className="capability-list">{capabilities.map(capability => <span key={capability}><Check size={12} />{capability}</span>)}</div><TechnologyBadge compact /></article> }
function WorkspaceProfile() { const { user, logout } = useAuth(); const navigate = useNavigate();

 if (!user) return <Link className="avatar" to="/login">?</Link>; return <ProfileMenu user={user} onLogout={() => { logout(); navigate('/') }} /> }
function Preview() { return <div className="preview-wrap"><div className="preview"><div className="preview-top"><Logo /><span>•••</span></div><div className="preview-body"><aside><div className="preview-side-active"><LayoutDashboard size={13} /></div>{[FileText, Network, ClipboardCheck, CircleAlert, TestTube2].map((I, i) => <I key={i} size={14} />)}</aside><div className="preview-content"><div className="preview-heading"><div><small>PROJECT OVERVIEW</small><h3>Smart Helmet Safety System</h3></div><Badge tone="lime">ACTIVE</Badge></div><div className="preview-stat"><span>PROJECT COMPLETION</span><b>42%</b><Progress value={42} /></div><div className="preview-next"><small>NEXT RECOMMENDED ACTION</small><h4>Define sensor failure and fallback states</h4><div><Badge tone="high">HIGH</Badge><span>30–45 min</span></div></div><div className="preview-bars"><span /><span /><span /></div></div></div></div></div> }

function NewProject() { const navigate = useNavigate();

 const [tech, setTech] = useState(['ESP32', 'React', 'Firebase']); const [value, setValue] = useState({ name: '', idea: '', objective: '', type: 'IoT / Embedded', constraints: '', timeline: '2–3 Months', stage: 'Idea' }); const [newTech, setNewTech] = useState(''); const submit = (e: FormEvent) => { e.preventDefault(); if (!value.name || !value.idea || !value.objective) return; const project = projectService.createProject({ ...value, technologies: tech }); navigate(`/project/${project.id}/initializing`) }; return <main className="onboarding"><header className="marketing-nav"><Logo /><span className="muted">NEW PROJECT <span className="slash">/</span> WORKSPACE SETUP</span><Link className="text-link" to="/">Cancel</Link></header><div className="form-wrap"><div className="form-heading"><Badge tone="lime">01 / PROJECT CONTEXT</Badge><h1>Let's understand<br />what you're building.</h1><p>Give ProjectPilot enough context to create your engineering workspace.</p></div><form onSubmit={submit} className="project-form"><label>Project Name<input required value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} placeholder="Smart Helmet Safety System" /></label><label>Project Idea / Problem<textarea required value={value.idea} onChange={e => setValue({ ...value, idea: e.target.value })} placeholder="Describe the engineering problem and the solution you want to build..." /></label><label>Primary Objective<textarea required value={value.objective} onChange={e => setValue({ ...value, objective: e.target.value })} placeholder="What must this project achieve?" /></label><div className="form-grid"><label>Project Type<select value={value.type} onChange={e => setValue({ ...value, type: e.target.value })}>{['IoT / Embedded', 'Web Application', 'Mobile Application', 'AI / ML', 'Automation', 'Robotics', 'Software System', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label><label>Timeline<select value={value.timeline} onChange={e => setValue({ ...value, timeline: e.target.value })}>{['1 Week', '2 Weeks', '1 Month', '2–3 Months', 'Custom'].map(x => <option key={x}>{x}</option>)}</select></label></div><label>Available Technologies<div className="chips">{tech.map(item => <span className="chip" key={item}>{item}<button type="button" onClick={() => setTech(tech.filter(x => x !== item))}>×</button></span>)}<input value={newTech} onChange={e => setNewTech(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTech) { e.preventDefault(); setTech([...tech, newTech]); setNewTech('') } }} placeholder="Add technology + Enter" /></div></label><label>Constraints<textarea value={value.constraints} onChange={e => setValue({ ...value, constraints: e.target.value })} placeholder="Limited hardware access, four-week timeline, student budget." /></label><label>Current Stage<select value={value.stage} onChange={e => setValue({ ...value, stage: e.target.value })}>{['Idea', 'Planning', 'Development', 'Testing', 'Almost Complete'].map(x => <option key={x}>{x}</option>)}</select></label><div className="form-actions"><Link className="btn btn-secondary" to="/">Cancel</Link><Button type="submit" icon={ArrowRight}>Create Project Workspace</Button></div></form></div></main> }

function ProjectShell({ children, project }: { children: React.ReactNode; project: Project }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();



  const [projectModalOpen, setProjectModalOpen] = useState(false);

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
        <div className="side-head">
          <Logo />
          <button className="icon-btn close-menu" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Interactive Current Project Card that triggers ProjectDetailsModal popup */}
        <div
          className="project-switcher"
          onClick={() => setProjectModalOpen(true)}
          role="button"
          tabIndex={0}
          title="Click to view workspace details & switch projects"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setProjectModalOpen(true);
            }
          }}
        >
          <div className="project-switcher-top">
            <span className="project-kicker">CURRENT PROJECT</span>
            <span className="project-popup-badge" title="Workspace info & switcher">
              <Info size={13} />
            </span>
          </div>
          <strong>{project.name}</strong>
          <div className="project-switcher-bottom">
            <span>{project.type}</span>
            {project.id === 'smart-helmet' && <Badge tone="lime">DEMO WORKSPACE</Badge>}
          </div>
        </div>

        <nav className="side-nav">
          {Object.entries(icons).map(([label, I]) => {
            const route = label === 'Overview' ? '' : routeNames[label];
            const href = `/project/${project.id}${route ? `/${route}` : ''}`;
            const isActive =
              location.pathname === href ||
              (label === 'Overview' && location.pathname === `/project/${project.id}`);

            // Dynamic live badge counters for each nav item
            let navBadge: React.ReactNode = null;
            if (label === 'Requirements') {
              navBadge = <span className="nav-counter">{project.requirements.length}</span>;
            } else if (label === 'Architecture') {
              navBadge = <span className="nav-counter">{project.architecture.length}</span>;
            } else if (label === 'Execution Plan') {
              const pending = project.tasks.filter(t => t.status !== 'Completed').length;
              navBadge = <span className="nav-counter">{pending}</span>;
            } else if (label === 'Risks & Gaps') {
              const openCount = project.risks.filter(r => !r.resolved).length;
              const hasCritical = project.risks.some(r => !r.resolved && r.severity === 'Critical');
              if (openCount > 0) {
                navBadge = (
                  <span className={`nav-counter ${hasCritical ? 'nav-counter-critical' : ''}`}>
                    {openCount}
                  </span>
                );
              }
            } else if (label === 'Testing') {
              navBadge = <span className="nav-counter">{project.tests.length}</span>;
            }

            return (
              <Link
                onClick={() => setOpen(false)}
                className={isActive ? 'active' : ''}
                to={href}
                key={label}
              >
                <I size={17} />
                <span className="nav-label">{label}</span>
                {navBadge}
              </Link>
            );
          })}
        </nav>

        <div className="side-footer">
          <EngineState />
          <button className="side-settings" onClick={() => navigate(`/project/${project.id}/api-keys`)}>
            <Key size={15} />
            API Keys & Access
          </button>
          <button className="back-home" onClick={() => navigate('/')}>
            <ArrowRight size={15} />
            Exit workspace
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Projects</span>
            <ChevronRight size={14} />
            <b>{project.name}</b>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="search search-trigger-btn"
              onClick={() => setSearchOpen(true)}
              title="Search workspace"
              aria-label="Search workspace"
            >
              <Search size={15} />
              <span>Search workspace</span>
            </button>
            <Button secondary icon={RefreshCw} onClick={() => navigate(`/project/${project.id}/risks`)}>
              Run Project Review
            </Button>
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

      {/* Project Details & Workspace Switcher Popup Modal */}
      <ProjectDetailsModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={project}
      />
    </div>
  );
}

function useProject() {
  const { id = 'smart-helmet' } = useParams();
  const [project, setProject] = useState<Project | undefined>(() => projectService.getProject(id));
  const refresh = () => setProject(projectService.getProject(id));
  return { project, refresh };
}

function ProjectRoute() {
  const { project, refresh } = useProject();
  const { id = 'smart-helmet' } = useParams();
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated && id !== 'smart-helmet') {
    return <Navigate to="/login" replace state={{ from: `/project/${id}` }} />;
  }
  if (!project) return <Navigate to="/new-project" />;

  return (
    <ProjectShell project={project}>
      <Routes>
        <Route path="initializing" element={<InitializationPage project={project} />} />
        <Route index element={<OverviewView project={project} refresh={refresh} />} />
        <Route path="requirements" element={<RequirementsView project={project} refresh={refresh} />} />
        <Route path="architecture" element={<ArchitectureView project={project} refresh={refresh} />} />
        <Route path="tasks" element={<ExecutionPlanView project={project} refresh={refresh} />} />
        <Route path="risks" element={<RisksView project={project} refresh={refresh} />} />
        <Route path="testing" element={<TestingView project={project} refresh={refresh} />} />
        <Route path="activity" element={<AgentActivityView project={project} />} />
        <Route path="api-keys" element={<ApiKeysView project={project} />} />
      </Routes>
    </ProjectShell>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 240);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      className={`back-to-top ${visible ? 'is-visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp size={16} />
      <span className="back-to-top-label">Back to top</span>
    </button>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/new-project" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/project/:id/*" element={<ProjectRoute />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BackToTop />
    </BrowserRouter>
  );
}
export default App
