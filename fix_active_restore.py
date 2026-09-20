import re

with open("src/pages/AccountPages.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = "const activeProject = Object.values(projects).find(p => p.id === 'smart-helmet') || Object.values(projects)[0]"
replacement = "const activeProject = Object.values(projects).find(p => p.id === 'smart-helmet') || Object.values(projects)[0]\n  const activeProjectId = activeProject?.id || 'smart-helmet'"

content = content.replace(target, replacement)

target2 = "function ProfilePage() {\n  const { user, logout } = useAuth()"
replacement2 = "function ProfilePage() {\n  const { user, logout } = useAuth()\n  const { projects } = useProject()\n  const activeProject = Object.values(projects).find(p => p.id === 'smart-helmet') || Object.values(projects)[0]\n  const activeProjectId = activeProject?.id || 'smart-helmet'"
content = content.replace(target2, replacement2)

with open("src/pages/AccountPages.tsx", "w", encoding="utf-8") as f:
    f.write(content)
