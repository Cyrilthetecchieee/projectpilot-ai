import re

with open('src/services/initializationService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove runRecord definition
content = re.sub(r'const runRecord =.*?=> \(\{.*?\}\)\n', '', content)

# Remove const started = new Date().toISOString(); from all run* methods
content = re.sub(r'const started = new Date\(\)\.toISOString\(\); ', '', content)

with open('src/services/initializationService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
