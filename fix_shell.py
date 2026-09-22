with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if "OrchestratorPanel" not in content:
    content = content.replace("import { ActivityPage } from './components/ActivityPage'", "import { ActivityPage } from './components/ActivityPage'\nimport { OrchestratorPanel } from './components/OrchestratorPanel'\nimport { Activity } from 'lucide-react'")

    # Add State
    state_injection = """
  const [showOrch, setShowOrch] = useState(false);
  const triggerRefresh = () => { if ((window as any).refreshProject) (window as any).refreshProject() };
"""
    content = content.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n" + state_injection)
    
    # Add Button
    btn_injection = """
            <button className="btn-run-autonomous" onClick={() => setShowOrch(true)}>
              <Activity size={14} /> Run Autonomously
            </button>
            <div className="user-menu">"""
    content = content.replace('<div className="user-menu">', btn_injection)
    
    # Add Panel Overlay
    panel_injection = """
        {showOrch && (
          <div className="orch-overlay-wrapper">
            <OrchestratorPanel 
              projectId={project.id} 
              onClose={() => setShowOrch(false)} 
              onAction={() => {}} 
              refreshWorkspace={triggerRefresh} 
            />
          </div>
        )}
        <div className="workspace-main">"""
    content = content.replace('<div className="workspace-main">', panel_injection)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
