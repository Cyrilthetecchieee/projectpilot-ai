import re
with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("UploadFile = File(None)", "UploadFile | None = None")

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
