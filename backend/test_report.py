import asyncio
from app.main import report_issue

async def test():
    project_data = '{"id": "test"}'
    try:
        await report_issue('test', project_data, 'task-1', 'description', None)
    except Exception as e:
        print('Error:', e)

asyncio.run(test())
