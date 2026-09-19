import re

with open('src/services/initializationService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'next\.activity = \[runRecord[^;]+;', '', content)

with open('src/services/initializationService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
