import re

with open("src/components/TechnologyAttribution.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove import
content = re.sub(r"import \{ apiKeyService \} from '\.\./services/apiKeyService'\n", "", content)

# Replace EngineState
engine_state_replacement = """export function EngineState() {
  return <div className="engine-state"><span className="status-dot" /><div><small>AI ENGINE</small><b>NVIDIA Nemotron</b><span>Verified backend execution</span></div><BrainCircuit size={15} /></div>
}"""

content = re.sub(r'export function EngineState\(\) \{.*?return <div className="engine-state">.*?</div>\n\}', engine_state_replacement, content, flags=re.DOTALL)

with open("src/components/TechnologyAttribution.tsx", "w", encoding="utf-8") as f:
    f.write(content)
