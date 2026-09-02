import React from 'react'
import './FileInspectorModal.css'

export default function FileInspectorModal({ filePath, data, lineRange, onClose }) {
  if (!filePath) return null

  const evidence = data?.evidence || {}
  const files = evidence.files || []
  const technologies = evidence.technologies || []
  const relationships = evidence.relationships || []

  // Look up file evidence details
  const fileDetail = files.find(f => f.path === filePath) || {
    path: filePath,
    category: 'SOURCE',
    importance: 'medium',
    reason: 'Inspected codebase file utilized in structural analysis.'
  }

  // Find technologies referencing this file
  const supportedTechs = technologies.filter(t => t.files?.includes(filePath))

  // Find relationships involving this file
  const outgoingRels = relationships.filter(r => r.from === filePath)
  const incomingRels = relationships.filter(r => r.to === filePath)

  return (
    <div className="inspector-backdrop" onClick={onClose}>
      <div className="inspector-drawer" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="inspector-header">
          <div className="inspector-title-group">
            <span className="inspector-tag-eyebrow">CODEBASE FILE INSPECTOR</span>
            <h3 className="inspector-file-path">
              <code>{filePath}</code>
            </h3>
          </div>
          <button 
            type="button" 
            className="inspector-close-btn" 
            onClick={onClose}
            aria-label="Close inspector"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="inspector-body">
          
          {/* FILE SPEC ROW */}
          <div className="inspector-spec-grid">
            <div className="spec-card">
              <span className="spec-card-label">CATEGORY</span>
              <span className="spec-card-val category">{fileDetail.category?.toUpperCase() || 'SOURCE'}</span>
            </div>
            <div className="spec-card">
              <span className="spec-card-label">IMPORTANCE</span>
              <span className={`spec-card-val importance ${fileDetail.importance}`}>
                {fileDetail.importance === 'high' ? 'HIGH IMPORTANCE' : 'MEDIUM'}
              </span>
            </div>
          </div>

          {/* PURPOSE / ROLE */}
          <div className="inspector-block">
            <span className="block-label">DETECTED PURPOSE / ROLE</span>
            <div className="block-content-box">
              <p className="purpose-text">{fileDetail.reason}</p>
            </div>
          </div>

          {/* CITED RANGE (IF ANY) */}
          {lineRange && (
            <div className="inspector-block cited-range-block">
              <span className="block-label">CITATION FOCUS</span>
              <div className="block-content-box" style={{ borderLeftColor: '#3b5bdb', backgroundColor: '#f0f4ff' }}>
                <p className="purpose-text" style={{ color: '#1c3d99', fontWeight: 600 }}>
                  <span className="chip-icon" style={{marginRight: '6px'}}>📍</span> 
                  Reference found in Lines {lineRange}
                </p>
                <p style={{fontSize: '11px', color: '#3b5bdb', marginTop: '6px', marginBottom: 0}}>
                  (Raw source preview is not loaded for this citation)
                </p>
              </div>
            </div>
          )}

          {/* SUPPORTED TECHNOLOGIES */}
          {supportedTechs.length > 0 && (
            <div className="inspector-block">
              <span className="block-label">VERIFIED TECHNOLOGIES SUPPORTED</span>
              <div className="tech-chips-list">
                {supportedTechs.map((tech, idx) => (
                  <div key={idx} className="tech-spec-chip">
                    <span className="chip-icon">✓</span>
                    <span className="chip-name">{tech.name}</span>
                    <span className="chip-conf">({tech.confidence.toUpperCase()})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CODE CONNECTIONS */}
          {(outgoingRels.length > 0 || incomingRels.length > 0) && (
            <div className="inspector-block">
              <span className="block-label">CODE CONNECTIONS & DEPENDENCIES</span>
              <div className="connections-trace-list">
                {outgoingRels.map((rel, idx) => (
                  <div key={`out-${idx}`} className="trace-item outgoing">
                    <span className="trace-dir-tag">OUTGOING</span>
                    <span className="trace-rel-label">{rel.relationship}</span>
                    <code>{rel.to}</code>
                  </div>
                ))}
                {incomingRels.map((rel, idx) => (
                  <div key={`in-${idx}`} className="trace-item incoming">
                    <span className="trace-dir-tag">INCOMING</span>
                    <span className="trace-rel-label">{rel.relationship}</span>
                    <code>{rel.from}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOOTER AUDIT NOTE */}
          <div className="inspector-footer-note">
            <span>Ground truth derived directly from scanned AST-level imports, manifests, and repository tree topology.</span>
          </div>

        </div>
      </div>
    </div>
  )
}
