import re

with open("src/pages/AccountPages.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add to ProfileMenu
target_profile_menu = "function ProfileMenu({ user, onLogout }: { user: User; onLogout: () => void }) {\n  const { projects } = useProject()\n  const [open, setOpen] = useState(false)\n  const navigate = useNavigate()"
replacement_profile_menu = "function ProfileMenu({ user, onLogout }: { user: User; onLogout: () => void }) {\n  const { projects } = useProject()\n  const [open, setOpen] = useState(false)\n  const navigate = useNavigate()\n  const activeProjectId = Object.values(projects).find(p => p.id === 'smart-helmet')?.id || Object.values(projects)[0]?.id || 'smart-helmet'"
content = content.replace(target_profile_menu, replacement_profile_menu)

# Add to AccountNavbar
target_navbar = """  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const projects = projectService.getProjects()
  const activeProject = projectService.getProject(activeProjectId)"""
replacement_navbar = """  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const projects = projectService.getProjects()
  const activeProjectId = Object.values(projects).find((p: any) => p.id === 'smart-helmet')?.id || Object.values(projects)[0]?.id || 'smart-helmet'
  const activeProject = projectService.getProject(activeProjectId)"""
content = content.replace(target_navbar, replacement_navbar)

with open("src/pages/AccountPages.tsx", "w", encoding="utf-8") as f:
    f.write(content)
