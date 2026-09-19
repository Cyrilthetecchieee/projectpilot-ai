import re

with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add plan_store and projects to _save_db
target_save = """            "test_store": {k: v.model_dump() for k, v in test_store.items()},
            "issues_store": {k: [i.model_dump() for i in v] for k, v in issues_store.items()}"""
replacement_save = """            "test_store": {k: v.model_dump() for k, v in test_store.items()},
            "issues_store": {k: [i.model_dump() for i in v] for k, v in issues_store.items()},
            "plan_store": {k: v.model_dump() for k, v in plan_store.items()},
            "projects": {k: v.model_dump() for k, v in projects.items()}"""
content = content.replace(target_save, replacement_save)

# Add plan_store and projects to _load_db
target_load = """        if "issues_store" in data:
            for k, v in data["issues_store"].items():
                issues_store[k] = [IssueRecord(**i) for i in v]"""
replacement_load = """        if "issues_store" in data:
            for k, v in data["issues_store"].items():
                issues_store[k] = [IssueRecord(**i) for i in v]
        if "plan_store" in data:
            for k, v in data["plan_store"].items():
                plan_store[k] = PlannerResponse(**v)
        if "projects" in data:
            for k, v in data["projects"].items():
                projects[k] = ProjectContext(**v)"""
content = content.replace(target_load, replacement_load)

# Let's also add _save_db() to generate_plan
content = content.replace("plan_store[project_id] = response\n    activity_store.setdefault", "plan_store[project_id] = response\n    _save_db()\n    activity_store.setdefault")

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
