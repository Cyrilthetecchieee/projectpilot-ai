with open("src/App.css", "a", encoding="utf-8") as f:
    f.write("""
/* Orchestrator Styles */
.btn-run-autonomous {
  background: rgba(43, 230, 116, 0.1);
  color: var(--lime);
  border: 1px solid rgba(43, 230, 116, 0.3);
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 12px;
}
.btn-run-autonomous:hover {
  background: rgba(43, 230, 116, 0.2);
}
.orch-overlay-wrapper {
  position: absolute;
  top: 60px;
  right: 20px;
  z-index: 1000;
  width: 380px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.orchestrator-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg-soft);
  border: 1px solid var(--border-hover);
  border-radius: 8px;
  padding: 20px;
}
.orch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.orch-title-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.orch-title-block h2 {
  font-size: 15px;
  margin: 0;
}
.btn-close-orch {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
}
.btn-close-orch:hover {
  color: var(--fg);
}
.orch-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  background: var(--bg);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.state-label {
  color: var(--fg);
}
.orch-spinner {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--lime);
  font-weight: 600;
}
.spin-icon {
  animation: spin 2s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }
.orch-start-prompt p {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 12px;
}
.orch-ready {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 20px 0;
}
.orch-ready h3 {
  margin: 0;
  color: var(--fg);
}
.orch-ready p {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 8px;
}
.orch-active-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.orch-current-agent strong {
  display: block;
  font-size: 16px;
  color: var(--fg);
  margin-top: 4px;
}
.orch-current-action p {
  font-size: 13px;
  margin: 4px 0 0;
}
.orch-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.orch-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}
.orch-human-input {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 12px;
  border-radius: 6px;
  display: flex;
  gap: 12px;
}
.orch-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 12px;
  border-radius: 6px;
  color: #ef4444;
}
.orch-error p {
  margin: 4px 0 0;
  font-size: 12px;
}
.orch-controls {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.orch-decisions {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.decision-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}
.decision-item {
  background: var(--bg);
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
}
.dec-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.dec-agent {
  font-weight: 600;
  color: var(--fg);
}
.dec-action {
  color: var(--muted);
}
.dec-reason {
  margin: 0 0 6px;
  color: var(--fg);
}
.dec-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
}
""")
