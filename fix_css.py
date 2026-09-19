with open('src/App.css', 'a', encoding='utf-8') as f:
    f.write("""

/* Issue Analysis Modal Styles */
.issue-modal {
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
}
.task-context-box {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.context-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
}
.upload-box {
  border: 2px dashed var(--border);
  border-radius: 6px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.2s;
}
.upload-box:hover {
  border-color: var(--border-hover);
  color: var(--fg);
}
.image-preview-container {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.image-preview {
  display: block;
  width: 100%;
  max-height: 200px;
  object-fit: cover;
}
.btn-remove-image {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.issue-analysis-panel {
  margin-top: 20px;
  background: var(--bg-subtle);
}
.issue-section {
  margin-bottom: 16px;
}
.issue-section p {
  margin: 4px 0 0;
  font-size: 13px;
}
.cause-list, .fix-list {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--fg);
}
.fix-list li {
  margin-bottom: 4px;
}
.issue-impact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.impact-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.impact-tag {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--fg);
  display: inline-block;
  width: fit-content;
}
.recovery-task-prompt {
  background: rgba(43, 230, 116, 0.05);
  border: 1px solid rgba(43, 230, 116, 0.2);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.recovery-info strong {
  color: var(--lime);
}
.recovery-info p {
  margin: 4px 0;
  font-size: 13px;
}
.recovery-info small {
  color: var(--muted);
  font-size: 11px;
}
""")
