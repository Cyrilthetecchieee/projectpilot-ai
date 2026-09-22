import re
import os

with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if "UploadFile" not in content:
    content = content.replace("from fastapi import FastAPI, HTTPException", "from fastapi import FastAPI, HTTPException, UploadFile, File, Form")

# Add issues_store
if "issues_store: dict[str, list[IssueRecord]] = {}" not in content:
    content = content.replace("test_store: dict[str, TestResponse] = {}", "test_store: dict[str, TestResponse] = {}\nissues_store: dict[str, list[IssueRecord]] = {}")
    
# Add schema imports
if "IssueRecord," not in content:
    content = content.replace("TestResponse,", "TestResponse,\n    IssueRecord,\n    IssueAnalysisResponse,")

# db parsing
if '"issues_store":' not in content:
    content = content.replace(
        '            "test_store": {k: v.model_dump() for k, v in test_store.items()}',
        '            "test_store": {k: v.model_dump() for k, v in test_store.items()},\n            "issues_store": {k: [i.model_dump() for i in v] for k, v in issues_store.items()}'
    )
if 'if "issues_store" in data:' not in content:
    content = content.replace(
        '                test_store[k] = TestResponse(**v)',
        '                test_store[k] = TestResponse(**v)\n        if "issues_store" in data:\n            for k, v in data["issues_store"].items():\n                issues_store[k] = [IssueRecord(**i) for i in v]'
    )

# Add endpoint
issue_endpoint = """
import uuid
import datetime

os.makedirs("uploads", exist_ok=True)

@app.post("/api/projects/{project_id}/issues", response_model=IssueRecord)
async def report_issue(project_id: str, task_id: str = Form(...), description: str = Form(...), image: UploadFile = File(None)):
    requirements = requirements_store.get(project_id)
    architecture = architecture_store.get(project_id)
    plan = plan_store.get(project_id)
    project = projects.get(project_id)
    if not requirements or not architecture or not plan or not project:
        raise HTTPException(status_code=409, detail="Project context not fully initialized")
    
    task = next((t for t in plan.tasks if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    image_bytes = None
    image_path = ""
    if image and image.filename:
        image_bytes = await image.read()
        if image_bytes:
            filename = f"{uuid.uuid4()}_{image.filename}"
            filepath = os.path.join("uploads", filename)
            with open(filepath, "wb") as out:
                out.write(image_bytes)
            image_path = filepath
            
    try:
        analysis, duration_ms = reviewer_agent.analyze_issue(project, requirements, architecture, plan, task, description, image_bytes)
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    issue = IssueRecord(
        id=f"iss-{uuid.uuid4().hex[:8]}",
        project_id=project_id,
        task_id=task_id,
        description=description,
        image_path=image_path,
        analysis=analysis,
        status="Open",
        created_at=datetime.datetime.utcnow().isoformat()
    )
    
    issues_store.setdefault(project_id, []).append(issue)
    _save_db()
    
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Reviewer Agent",
        "action": "Analyze Execution Issue",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": analysis.issue_summary,
    })
    
    return issue
"""

if "report_issue" not in content:
    content = content + issue_endpoint

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
