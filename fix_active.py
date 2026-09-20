import re

with open("src/pages/AccountPages.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r' *const activeProjectId = .*?\n', '', content)

with open("src/pages/AccountPages.tsx", "w", encoding="utf-8") as f:
    f.write(content)
