import re

with open("src/services/agentService.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Remove import
content = re.sub(r"import \{ apiKeyService \} from '\./apiKeyService'\n", "", content)

# Remove recordLiveAiExecution
content = re.sub(r" *apiKeyService\.recordLiveAiExecution\(.*?\)\n", "", content)

# Remove create task mock validation
target = """    const engine = apiKeyService.getAiEngineStatus()
    const keyToValidate = engine.activeKey?.key || engine.activeKey?.maskedValue
    if (keyToValidate) apiKeyService.validateApiKey(keyToValidate)"""
content = content.replace(target, "")

with open("src/services/agentService.ts", "w", encoding="utf-8") as f:
    f.write(content)
