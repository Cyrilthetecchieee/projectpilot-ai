import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r' *const \[showOrch, setShowOrch\] = useState\(false\);\n', '', content)
content = re.sub(r' *const triggerRefresh = \(\) => \{ if \(\(window as any\)\.refreshProject\) \(\(window as any\)\.refreshProject\(\) \};\n', '', content)

target_shell_start = "function ProjectShell({ children, project }: { children: ReactNode; project: Project }) {"
replacement_shell_start = """function ProjectShell({ children, project }: { children: ReactNode; project: Project }) {
  const [showOrch, setShowOrch] = useState(false);
  const triggerRefresh = () => { if ((window as any).refreshProject) (window as any).refreshProject() };"""
content = content.replace(target_shell_start, replacement_shell_start)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
