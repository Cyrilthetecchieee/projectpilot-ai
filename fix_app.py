import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove import
content = content.replace("import { ApiKeysView } from './components/ApiKeysView'\n", "")

# 2. Remove routeNames entry
content = content.replace(", 'API Keys': 'api-keys'", "")

# 3. Remove sidebar button
# <button className="side-settings" onClick={() => navigate(`/project/${project.id}/api-keys`)}><Key size={15} />API Keys & Access</button>
content = re.sub(r'<button className="side-settings" onClick=\{\(\) => navigate\(`/project/\$\{project\.id\}/api-keys`\)\}><Key size=\{15\} />API Keys & Access</button>', '', content)

# 4. Remove Route
# <Route path="api-keys" element={<ApiKeysView project={project} />} />
content = re.sub(r'<Route path="api-keys" element=\{<ApiKeysView project=\{project\} />\} />', '', content)

# 5. Remove from dashboard array
# ['API Keys', 'Credentials Active', 'Manage Scopes', '/api-keys', Key],
content = re.sub(r" *\[\'API Keys\', \'Credentials Active\', \'Manage Scopes\', \'/api-keys\', Key\],?\n?", "", content)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
