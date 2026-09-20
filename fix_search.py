import re

with open("src/components/WorkspaceSearchModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove api-keys search result
api_keys_result = """      {
        id: 'page-api-keys',
        title: 'API Keys & Credentials',
        type: 'Settings',
        route: `/project/${project.id}/api-keys`,
        icon: Key
      },"""

content = content.replace(api_keys_result, "")

with open("src/components/WorkspaceSearchModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
