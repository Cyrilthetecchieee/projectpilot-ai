import re

# Fix agentService.ts
with open('src/services/agentService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'id: TC-\\,', 'id: `TC-${String(idx + 1).padStart(2, "0")}`,', content)
content = re.sub(r'\$\\{API_BASE_URL\\}', '${API_BASE_URL}', content)
content = re.sub(r'\$\\{encodeURIComponent', '${encodeURIComponent', content)

with open('src/services/agentService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix App.tsx
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'id: `a-\\\$\{Date\.now\(\)\}`', 'id: `a-${Date.now()}`', content)
content = re.sub(r'duration: `\\\$\{result\.analysis\.duration_ms\}ms`', 'duration: `${result.analysis.duration_ms}ms`', content)
content = re.sub(r'summary: `\\\$\{result\.tests\.length\} test cases generated`', 'summary: `${result.tests.length} test cases generated`', content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
