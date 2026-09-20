import re

with open("src/pages/AccountPages.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the link in ProfileMenu
menu_link = """            <Link to={`/project/${activeProjectId}/api-keys`} onClick={() => setOpen(false)}>
              <Key size={15} />
              API Keys & Vault
            </Link>"""
content = content.replace(menu_link, "")

# 2. Remove the section in ProfilePage
section = """                <div className="pref-row">
                  <div>
                    <strong>API Keys & Integration Tokens</strong>
                    <span>Generate scoped credentials for external agents and model inference</span>
                  </div>
                  <Link className="btn btn-secondary" to={`/project/${activeProjectId}/api-keys`}>
                    <Key size={14} /> Open API Keys Vault
                  </Link>
                </div>"""
content = content.replace(section, "")

with open("src/pages/AccountPages.tsx", "w", encoding="utf-8") as f:
    f.write(content)
