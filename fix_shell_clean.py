import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the multiple injections of showOrch and triggerRefresh
content = re.sub(r'  const \[showOrch, setShowOrch\] = useState\(false\);\n  const triggerRefresh = \(\) => \{ if \(\(window as any\).refreshProject\) \(\(window as any\).refreshProject\(\) \};\n', '', content)

# Remove the btn_injection from everywhere
content = content.replace('<button className="btn-run-autonomous" onClick={() => setShowOrch(true)}>\n              <Activity size={14} /> Run Autonomously\n            </button>\n            <div className="user-menu">', '<div className="user-menu">')

# Remove the panel overlay from everywhere
content = re.sub(r'        \{showOrch && \(\n          <div className="orch-overlay-wrapper">\n            <OrchestratorPanel \n              projectId=\{project.id\} \n              onClose=\{\(\) => setShowOrch\(false\)\} \n              onAction=\{\(\) => \{\}\} \n              refreshWorkspace=\{triggerRefresh\} \n            />\n          </div>\n        \)\}\n        <div className="workspace-main">', '<div className="workspace-main">', content)


# Now specifically inject into ProjectShell
# ProjectShell starts with: function ProjectShell({ children, project }: { children: ReactNode; project: Project }) {

target_shell_start = "function ProjectShell({ children, project }: { children: ReactNode; project: Project }) {"
replacement_shell_start = """function ProjectShell({ children, project }: { children: ReactNode; project: Project }) {
  const [showOrch, setShowOrch] = useState(false);
  const triggerRefresh = () => { if ((window as any).refreshProject) (window as any).refreshProject() };"""
content = content.replace(target_shell_start, replacement_shell_start)

# Inject button near user-menu inside ProjectShell
target_menu = '<div className="user-menu">'
btn_injection = """<button className="btn-run-autonomous" onClick={() => setShowOrch(true)}>
              <Activity size={14} /> Run Autonomously
            </button>
            <div className="user-menu">"""
content = content.replace(target_menu, btn_injection, 1) # Only replace the first one which should be in ProjectShell (actually let's just make sure)

# Wait, `user-menu` is in `WorkspaceProfile` (1) and `ProjectShell` (1). Let's use a more specific target for ProjectShell.
# In ProjectShell: `<header className="workspace-header"><div className="workspace-header-actions"><div className="user-menu">`
# I'll just use regex to target ProjectShell's header.

content = content.replace(btn_injection, target_menu) # undo if any

target_header_actions = '<div className="workspace-header-actions">'
replacement_header_actions = '<div className="workspace-header-actions">\n            ' + btn_injection.replace('            <div className="user-menu">', '')
content = content.replace(target_header_actions, replacement_header_actions)

target_main = '<div className="workspace-main">'
panel_injection = """        {showOrch && (
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
content = content.replace(target_main, panel_injection, 1)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
