with open("src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "const triggerRefresh = () => { if ((window as any).refreshProject) (window as any).refreshProject() };" in line:
        continue
    new_lines.append(line)

content = "".join(new_lines)

target_shell_start = "function ProjectShell({ children, project }: { children: ReactNode; project: Project }) {\n  const [showOrch, setShowOrch] = useState(false);"
replacement_shell_start = """function ProjectShell({ children, project }: { children: ReactNode; project: Project }) {
  const [showOrch, setShowOrch] = useState(false);
  const triggerRefresh = () => { if ((window as any).refreshProject) (window as any).refreshProject() };"""

content = content.replace(target_shell_start, replacement_shell_start)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
