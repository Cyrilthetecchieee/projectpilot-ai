import { BrainCircuit, Check, ChevronDown, Cloud, Network, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { aiProvider } from '../config/aiProvider'
import { apiKeyService } from '../services/apiKeyService'

export function TechnologyBadge({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <button className={`technology-badge ${compact ? 'technology-badge-compact' : ''}`} onClick={() => setOpen(true)} aria-label="View ProjectPilot technology stack">
      <span className="status-dot" />
      <span>{compact ? 'NVIDIA Nemotron × Nebius Token Factory' : 'Powered by NVIDIA Nemotron • Built with Nebius Token Factory'}</span>
    </button>
    {open && <TechnologyModal onClose={() => setOpen(false)} />}
  </>
}

export function TechnologyFooter() {
  return <div className="technology-footer"><strong>ProjectPilot AI</strong><span>Agentic Engineering Workspace</span><small>Powered by NVIDIA Nemotron</small><small>Built with Nebius Token Factory</small></div>
}

export function EngineState() {
  const [engineStatus, setEngineStatus] = useState(() => apiKeyService.getAiEngineStatus())

  useEffect(() => {
    const refresh = () => setEngineStatus(apiKeyService.getAiEngineStatus())
    window.addEventListener('storage', refresh)
    window.addEventListener('projectpilot:ai-engine-status-changed', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('projectpilot:ai-engine-status-changed', refresh)
    }
  }, [])

  const live = engineStatus.mode === 'Live Connected'
  const title = live ? engineStatus.providerName : aiProvider.isMock ? 'Mock Mode' : engineStatus.providerName
  const detail = live ? engineStatus.modelName || 'Verified backend execution' : aiProvider.isMock ? 'Nemotron integration pending' : 'via Nebius Token Factory'

  return <div className="engine-state"><span className="status-dot" /><div><small>AI ENGINE</small><b>{title}</b><span>{detail}</span></div><BrainCircuit size={15} /></div>
}

export function TechnologyModal({ onClose }: { onClose: () => void }) {
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="technology-modal" role="dialog" aria-modal="true" aria-labelledby="technology-title"><button className="modal-close" onClick={onClose} aria-label="Close technology stack"><X size={17} /></button><span className="eyebrow">THE INTELLIGENCE BEHIND PROJECTPILOT</span><h2 id="technology-title">Technology Stack</h2><p>ProjectPilot uses NVIDIA Nemotron models as its AI reasoning layer, accessed through Nebius Token Factory.</p><div className="architecture-stack"><span><Network size={15} />Engineering Workspace</span><ChevronDown size={15} /><span><BrainCircuit size={15} />ProjectPilot Agent Orchestrator</span><ChevronDown size={15} /><span><Cloud size={15} />Nebius Token Factory</span><ChevronDown size={15} /><span><BrainCircuit size={15} />NVIDIA Nemotron</span></div><div className="modal-agents"><small>SPECIALIZED AGENTS</small><div>{['Requirement Agent', 'Architecture Agent', 'Planner Agent', 'Reviewer Agent', 'Test Agent'].map(agent => <span key={agent}><Check size={12} />{agent}</span>)}</div></div><p className="modal-footnote">Learn more about the technology powering ProjectPilot.</p></div></div>
}

export function AgentSimulationState({ agent = 'Agent' }: { agent?: string }) {
  return <div className="simulation-state"><span className="running-icon"><BrainCircuit size={18} /></span><div><strong>{agent} Simulation</strong><span>Nemotron integration pending</span></div></div>
}
