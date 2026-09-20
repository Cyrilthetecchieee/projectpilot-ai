import re

with open("src/pages/AccountPages.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """                <div className="security-row">
                  <div>
                    <strong>API Keys & Integration Tokens</strong>
                    <span>Generate scoped credentials for external agents and model inference</span>
                  </div>
                  <Link className="btn btn-secondary" to={`/project/${activeProjectId}/api-keys`}>
                    <Key size={14} /> Open API Keys Vault
                  </Link>
                </div>"""

content = content.replace(target, "")

with open("src/pages/AccountPages.tsx", "w", encoding="utf-8") as f:
    f.write(content)
