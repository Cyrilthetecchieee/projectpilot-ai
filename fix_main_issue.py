import re

with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoint = """
import json

@app.post("/api/projects/{project_id}/issues", response_model=IssueRecord)
async def report_issue(project_id: str, project_data: str = Form(...), task_id: str = Form(...), description: str = Form(...), image: UploadFile | None = None):
    try:
        p_data = json.loads(project_data)
        
        # Build ProjectContext
        project = ProjectContext(
            id=p_data.get("id", project_id),
            name=p_data.get("name", "Unknown"),
            objective=p_data.get("objective", ""),
            type=p_data.get("type", ""),
            technologies=p_data.get("technologies", [])
        )
        
        # Build RequirementAnalysis
        reqs = p_data.get("requirements", [])
        from app.schemas import RequirementItem, Priority
        def map_req(r): return RequirementItem(title=r.get("text", "Req")[:50], description=r.get("text", ""), priority=r.get("priority", "medium").lower())
        requirements = RequirementAnalysis(
            problem=p_data.get("requirementProblem", "None"),
            functional_requirements=[map_req(r) for r in reqs if r.get("kind") == "Functional"],
            non_functional_requirements=[map_req(r) for r in reqs if r.get("kind") == "Non-functional"]
        )
        
        # Build ArchitectureAnalysis
        archs = p_data.get("architecture", [])
        from app.schemas import ArchitectureComponent
        components = []
        for a in archs:
            components.append(ArchitectureComponent(
                id=a.get("id", "ac"),
                name=a.get("name", "Unknown"),
                type=a.get("type", "other"),
                responsibility=a.get("responsibility", ""),
                inputs=a.get("inputs", []),
                outputs=a.get("outputs", [])
            ))
        if not components:
            components = [ArchitectureComponent(id="mock", name="mock", type="other", responsibility="mock")]
        architecture = ArchitectureAnalysis(
            summary="Mock summary",
            components=components
        )
        
        # Build ExecutionPlan
        tasks_data = p_data.get("tasks", [])
        from app.schemas import ExecutionPlan, PlannerTask, Milestone
        tasks = []
        target_task = None
        for i, t in enumerate(tasks_data):
            pt = PlannerTask(
                id=t.get("id", f"t-{i}"),
                milestone_id="m-1",
                title=t.get("title", ""),
                description=t.get("successCriteria", ""),
                priority=t.get("priority", "medium").lower(),
                status="todo"
            )
            tasks.append(pt)
            if pt.id == task_id:
                target_task = pt
                
        plan = ExecutionPlan(
            summary="Plan",
            milestones=[Milestone(id="m-1", title="Default Milestone", order=1)],
            tasks=tasks if tasks else [PlannerTask(id="mock", milestone_id="m-1", title="mock", priority="medium")]
        )
        
        if not target_task:
            target_task = PlannerTask(id=task_id, milestone_id="m-1", title="Unknown Task", priority="medium")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid project_data JSON: {e}")

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
        analysis, duration_ms = reviewer_agent.analyze_issue(project, requirements, architecture, plan, target_task, description, image_bytes)
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

# replace the old report_issue endpoint
content = re.sub(r'@app\.post\("/api/projects/\{project_id\}/issues".*?return issue', new_endpoint.strip(), content, flags=re.DOTALL)

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
