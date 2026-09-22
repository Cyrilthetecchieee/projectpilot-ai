import sys

with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add test_agent import
content = content.replace(
    'from app.agents.reviewer_agent import reviewer_agent',
    'from app.agents.reviewer_agent import reviewer_agent\nfrom app.agents.test_agent import test_agent'
)

# Add Test schemas
content = content.replace(
    '    ReviewRequest,\n    ReviewResponse,\n)',
    '    ReviewRequest,\n    ReviewResponse,\n    TestRequest,\n    TestResponse,\n)'
)

# Add test_store dict
content = content.replace(
    'review_store: dict[str, ReviewResponse] = {}',
    'review_store: dict[str, ReviewResponse] = {}\ntest_store: dict[str, TestResponse] = {}'
)

# Add endpoint
test_endpoint = '''
@app.post("/api/projects/{project_id}/agents/tests", response_model=TestResponse)
def generate_tests(project_id: str, request: TestRequest) -> TestResponse:
    if request.project.id != project_id:
        raise HTTPException(status_code=400, detail="Project payload ID does not match the URL")
    requirements = requirements_store.get(project_id)
    if not requirements:
        raise HTTPException(status_code=409, detail={"code": "REQUIREMENTS_REQUIRED", "message": "Analyze project requirements before generating tests."})
    architecture = architecture_store.get(project_id)
    if not architecture:
        raise HTTPException(status_code=409, detail={"code": "ARCHITECTURE_REQUIRED", "message": "Generate project architecture before generating tests."})
    
    projects[project_id] = request.project
    try:
        analysis, duration_ms = test_agent.analyze(request.project, requirements, architecture)
    except AuthenticationError as error:
        raise HTTPException(status_code=502, detail="NVIDIA authentication failed") from error
    except RateLimitError as error:
        raise HTTPException(status_code=429, detail="NVIDIA rate limit or quota issue") from error
    except NotFoundError as error:
        raise HTTPException(status_code=502, detail="Configured Nemotron model is unavailable") from error
    except APIStatusError as error:
        raise HTTPException(status_code=502, detail="NVIDIA provider request failed") from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    response = TestResponse(
        **analysis.model_dump(),
        project_id=project_id,
        model=nvidia_client.model,
        duration_ms=duration_ms,
    )
    test_store[project_id] = response
    _save_db() # Wait, need to save to db if I added it to db, but plan is not saved. So no _save_db for now.
    activity_store.setdefault(project_id, []).insert(0, {
        "agent": "Test Agent",
        "action": "Generate Verification Strategy",
        "provider": "NVIDIA",
        "model": nvidia_client.model,
        "status": "completed",
        "duration_ms": duration_ms,
        "summary": f"{len(analysis.test_cases)} test cases generated",
    })
    return response

@app.get("/api/projects/{project_id}/tests", response_model=TestResponse)
def get_tests(project_id: str) -> TestResponse:
    result = test_store.get(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tests have not been generated")
    return result
'''
content = content + test_endpoint

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
