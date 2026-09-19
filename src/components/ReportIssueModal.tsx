import { useState, useRef } from 'react'
import { X, UploadCloud, RefreshCw } from 'lucide-react'
import type { Task, Project, IssueRecord } from '../types'
import { agentService } from '../services/agentService'
import { IssueAnalysisResult } from './IssueAnalysisResult'

export function ReportIssueModal({ isOpen, onClose, task, project, refresh }: { isOpen: boolean, onClose: () => void, task: Task, project: Project, refresh: () => void }) {
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<IssueRecord | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        setError('Unsupported image format. Use PNG, JPG, or WEBP.')
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const analyzeIssue = async () => {
    if (!description.trim()) return
    setAnalyzing(true)
    setError('')
    try {
      const issue = await agentService.analyzeIssue(project, task.id, description, imageFile || undefined)
      setResult(issue)
      refresh()
    } catch (e: any) {
      setError(e.message || 'Failed to analyze issue.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="add-task-modal-backdrop" onClick={onClose}>
      <div className="add-task-modal-card issue-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2>Report Issue</h2>
        
        {!result && !analyzing && (
          <div className="task-context-box">
            <span className="eyebrow">CONTEXT TASK</span>
            <strong>{task.id}: {task.title}</strong>
            <div className="context-meta">
              <span>Status: {task.status}</span>
              {task.dependency && <span>Depends on: {task.dependency}</span>}
            </div>
          </div>
        )}

        {error && <div className="toast error-toast">{error}</div>}

        {analyzing && (
          <div className="agent-progress panel">
            <div className="simulation-state">
              <span className="running-icon"><RefreshCw size={18} className="spin-icon" /></span>
              <div>
                <strong>Reviewer Agent is investigating the issue...</strong>
                <span>Powered by NVIDIA Nemotron</span>
              </div>
            </div>
            <div>
              <div className="progress-step"><span className="step-done"><Check size={12} /></span>Reading task context</div>
              <div className="progress-step"><span className="step-done"><Check size={12} /></span>Evaluating dependencies</div>
              <div className="progress-step"><span className="step-done"><Check size={12} /></span>Diagnosing issue</div>
            </div>
          </div>
        )}

        {!analyzing && !result && (
          <div className="add-task-form">
            <label>
              Issue Description *
              <textarea
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what went wrong while working on this task..."
              />
            </label>

            <label className="image-upload-label">
              Image / Screenshot (Optional)
              {imagePreview ? (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                  <button type="button" onClick={removeImage} className="btn-remove-image"><X size={14} /> Remove</button>
                </div>
              ) : (
                <div className="upload-box" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud size={24} />
                  <span>Click to upload image (PNG, JPG, WEBP)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </label>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={analyzeIssue}
                disabled={!description.trim() || analyzing}
              >
                Analyze Issue
              </button>
            </div>
          </div>
        )}

        {result && (
          <IssueAnalysisResult issue={result} project={project} refresh={refresh} />
        )}
      </div>
    </div>
  )
}

function Check({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
}
