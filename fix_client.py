import re

with open('backend/app/ai/nvidia_client.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("messages: list[dict[str, str]],", "messages: list[dict[str, typing.Any]],")
content = "import typing\n" + content

with open('backend/app/ai/nvidia_client.py', 'w', encoding='utf-8') as f:
    f.write(content)
