import re

with open('src/services/initializationService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace runRecord calls in next.activity = [...]
# Example: next.activity = [runRecord('requirements', 'Initialized project requirements', started, `${next.requirements.length} requirements identified`), ...next.activity];
content = re.sub(r'next\.activity = \[runRecord\([^\]]+\], \.\.\.next\.activity\];', '', content)
# Wait, the regex might not match perfectly if there are brackets. Let's just match "next.activity = [runRecord(.*?];"

# Let's do it safer.
content = re.sub(r'next\.activity = \[runRecord\([^\)]+\)[^\]]*\], \.\.\.next\.activity\];', '', content)
content = re.sub(r'next\.activity = \[runRecord.*?\], \.\.\.next\.activity\];', '', content)

with open('src/services/initializationService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
