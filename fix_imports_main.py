with open("backend/app/main.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("from app.schemas import RequirementItem, Priority", "from app.schemas import RequirementItem, Priority, RequirementAnalysis")
content = content.replace("from app.schemas import ArchitectureComponent", "from app.schemas import ArchitectureComponent, ArchitectureAnalysis")
content = content.replace("project = ProjectContext(", "from app.schemas import ProjectContext\n        project = ProjectContext(")

with open("backend/app/main.py", "w", encoding="utf-8") as f:
    f.write(content)
