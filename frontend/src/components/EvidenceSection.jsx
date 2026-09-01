import { useState } from 'react'
import './EvidenceSection.css'

export default function EvidenceSection({ evidence, onSelectFile }) {
  const [activeTab, setActiveTab] = useState('audit') // Default to 'audit'
  const [auditFilter, setAuditFilter] = useState('ALL') // 'ALL' | 'VERIFIED' | 'NOT_FOUND' | 'PARTIAL'

  if (!evidence) {
    return null
  }

  const {
    technologies = [],
    files = [],
    relationships = [],
    documentationAudit = []
  } = evidence

  // Normalize documentationAudit
  const auditList = Array.isArray(documentationAudit) 
    ? documentationAudit 
    : [
        ...(documentationAudit.verifiedClaims || []).map(c => ({
          claim: c.claim,
          category: 'Claim',
          verdict: 'VERIFIED',
          confidence: 'HIGH',
          summary: c.reason || 'Verified by codebase evidence.',
          evidence: [{ type: 'positive', file: 'codebase', reason: c.reason }]
        })),
        ...(documentationAudit.partialClaims || []).map(c => ({
          claim: c.claim,
          category: 'Claim',
          verdict: 'PARTIAL',
          confidence: 'MEDIUM',
          summary: c.reason || 'Partial evidence detected.',
          evidence: [{ type: 'positive', file: 'codebase', reason: c.reason }]
        })),
        ...(documentationAudit.unverifiedClaims || []).map(c => ({
          claim: c.claim,
          category: 'Claim',
          verdict: 'NOT_FOUND',
          confidence: 'HIGH',
          summary: c.reason || 'No code evidence found in scanned files.',
          negativeEvidence: [{ type: 'negative', file: 'codebase', reason: c.reason }]
        }))
      ]

  const verifiedCount = auditList.filter(a => a.verdict === 'VERIFIED').length
  const partialCount = auditList.filter(a => a.verdict === 'PARTIAL').length
  const notFoundCount = auditList.filter(a => a.verdict === 'NOT_FOUND').length

  const filteredAuditList = auditFilter === 'ALL'
    ? auditList
    : auditList.filter(a => a.verdict === auditFilter)

  return (
    <div className="evidence-section">
      <div className="evidence-header">
        <div className="evidence-title-group">
          <span className="evidence-badge">EVIDENCE-FIRST REPOSITORY AUDIT</span>
          <h2>Codebase Evidence & Documentation Verification</h2>
          <p className="evidence-subtitle">
            REPO IQ verifies technical assertions against package manifests, AST-level imports, and scanned repository files.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="evidence-tabs">
          <button
            type="button"
            className={`evidence-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Documentation Audit ({auditList.length})
          </button>
          <button
            type="button"
            className={`evidence-tab ${activeTab === 'technologies' ? 'active' : ''}`}
            onClick={() => setActiveTab('technologies')}
          >
            Verified Technologies ({technologies.length})
          </button>
          <button
            type="button"
            className={`evidence-tab ${activeTab === 'relationships' ? 'active' : ''}`}
            onClick={() => setActiveTab('relationships')}
          >
            Architecture Evidence ({relationships.length})
          </button>
        </div>
      </div>

      {/* TAB 1: 3-STEP SMART DOCUMENTATION AUDIT */}
      {activeTab === 'audit' && (
        <div className="audit-wrapper">
          {/* STATS OVERVIEW BAR */}
          <div className="audit-overview-bar">
            <button
              type="button"
              className={`audit-stat-btn verified ${auditFilter === 'VERIFIED' ? 'selected' : ''}`}
              onClick={() => setAuditFilter(auditFilter === 'VERIFIED' ? 'ALL' : 'VERIFIED')}
            >
              <span className="stat-count">{verifiedCount}</span>
              <span className="stat-label">✓ Verified Claims</span>
            </button>
            <button
              type="button"
              className={`audit-stat-btn partial ${auditFilter === 'PARTIAL' ? 'selected' : ''}`}
              onClick={() => setAuditFilter(auditFilter === 'PARTIAL' ? 'ALL' : 'PARTIAL')}
            >
              <span className="stat-count">{partialCount}</span>
              <span className="stat-label">⚠ Partial Matches</span>
            </button>
            <button
              type="button"
              className={`audit-stat-btn not-found ${auditFilter === 'NOT_FOUND' ? 'selected' : ''}`}
              onClick={() => setAuditFilter(auditFilter === 'NOT_FOUND' ? 'ALL' : 'NOT_FOUND')}
            >
              <span className="stat-count">{notFoundCount}</span>
              <span className="stat-label">✕ Not Found / Mismatches</span>
            </button>
          </div>

          {/* 3-STEP EVIDENCE TRAILS LIST */}
          <div className="audit-trails-container">
            {filteredAuditList.length === 0 ? (
              <div className="empty-state">No documentation claims matching the selected filter.</div>
            ) : (
              filteredAuditList.map((item, idx) => (
                <div key={idx} className={`audit-trail-card ${item.verdict.toLowerCase().replace('_', '-')}`}>
                  
                  {/* STEP 1: DOCUMENTATION CLAIM */}
                  <div className="trail-step step-claim">
                    <div className="step-header">
                      <span className="step-num-badge">01</span>
                      <span className="step-title">DOCUMENTATION CLAIM</span>
                      <span className="claim-category-badge">{item.category?.toUpperCase() || 'FEATURE'}</span>
                    </div>

                    <div className="claim-quote-box">
                      <p className="claim-text">"{item.claim}"</p>
                      {item.subject && (
                        <span className="claim-subject-tag">Subject: <strong>{item.subject}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* CONNECTOR ARROW */}
                  <div className="trail-connector">
                    <div className="connector-line"></div>
                    <div className="connector-arrow">↓</div>
                  </div>

                  {/* STEP 2: SEARCHED CODE EVIDENCE */}
                  <div className="trail-step step-evidence">
                    <div className="step-header">
                      <span className="step-num-badge">02</span>
                      <span className="step-title">SEARCHED CODE EVIDENCE</span>
                    </div>

                    {/* POSITIVE EVIDENCE */}
                    {item.evidence && item.evidence.length > 0 && (
                      <div className="evidence-list positive-list">
                        {item.evidence.map((ev, eIdx) => (
                          <div key={eIdx} className="evidence-item positive">
                            <span className="ev-icon positive">✓</span>
                            <div className="ev-body">
                              <div className="ev-top-line">
                                <button
                                  type="button"
                                  className="ev-file-btn"
                                  onClick={() => onSelectFile && onSelectFile(ev.file)}
                                  title="Click to inspect file details in side panel"
                                >
                                  <code>{ev.file}</code>
                                </button>
                                {ev.lines && <span className="ev-lines-pill">{ev.lines}</span>}
                              </div>
                              <p className="ev-desc">{ev.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* NEGATIVE EVIDENCE */}
                    {item.negativeEvidence && item.negativeEvidence.length > 0 && (
                      <div className="evidence-list negative-list">
                        {item.negativeEvidence.map((neg, nIdx) => (
                          <div key={nIdx} className="evidence-item negative">
                            <span className="ev-icon negative">✕</span>
                            <div className="ev-body">
                              {neg.file && neg.file !== 'codebase' && (
                                <button
                                  type="button"
                                  className="ev-file-btn"
                                  onClick={() => onSelectFile && onSelectFile(neg.file)}
                                >
                                  <code>{neg.file}</code>
                                </button>
                              )}
                              <p className="ev-desc negative">{neg.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ALTERNATIVE / CONTRADICTORY STACK DETECTED */}
                    {item.alternativeFound && (
                      <div className="alternative-alert">
                        <span className="alt-icon">↳</span>
                        <span className="alt-text">{item.alternativeFound}</span>
                      </div>
                    )}

                    {/* SEARCHED LOCATIONS FOOTER */}
                    {item.searchedEvidence && item.searchedEvidence.length > 0 && (
                      <div className="searched-footer">
                        <span className="searched-label">AUDITED LOCATIONS:</span>
                        <div className="searched-tags-wrap">
                          {item.searchedEvidence.map((loc, lIdx) => (
                            <span key={lIdx} className="searched-tag">{loc}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CONNECTOR ARROW */}
                  <div className="trail-connector">
                    <div className="connector-line"></div>
                    <div className="connector-arrow">↓</div>
                  </div>

                  {/* STEP 3: VERDICT & CONFIDENCE */}
                  <div className="trail-step step-verdict">
                    <div className="step-header">
                      <span className="step-num-badge">03</span>
                      <span className="step-title">AUDIT VERDICT</span>
                    </div>

                    <div className="verdict-card-body">
                      <div className="verdict-badge-row">
                        <span className={`verdict-badge ${item.verdict.toLowerCase().replace('_', '-')}`}>
                          {item.verdict === 'VERIFIED' ? '✓ VERIFIED' : item.verdict === 'PARTIAL' ? '⚠ PARTIAL' : '✕ NOT FOUND IN SCANNED EVIDENCE'}
                        </span>
                        <span className={`confidence-tag ${item.confidence?.toLowerCase()}`}>
                          Confidence: {item.confidence || 'HIGH'}
                        </span>
                      </div>
                      <p className="verdict-summary-text">{item.summary}</p>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED TECHNOLOGIES */}
      {activeTab === 'technologies' && (
        <div className="tech-evidence-grid">
          {technologies.length === 0 ? (
            <div className="empty-state">No verified technologies detected in the scanned manifests.</div>
          ) : (
            technologies.map((tech, idx) => (
              <div key={idx} className="tech-evidence-card">
                <div className="tech-card-header">
                  <div>
                    <h4 className="tech-name">{tech.name}</h4>
                    <span className="tech-category-pill">{tech.category.toUpperCase()}</span>
                  </div>
                  <div className={`confidence-badge ${tech.confidence?.toLowerCase()}`}>
                    {tech.confidence === 'HIGH' ? '✓ HIGH CONFIDENCE' : tech.confidence === 'MEDIUM' ? '⚠ MEDIUM CONFIDENCE' : '○ LOW CONFIDENCE'}
                  </div>
                </div>

                <p className="tech-reason">{tech.reason}</p>

                {tech.evidenceChecklist && tech.evidenceChecklist.length > 0 && (
                  <div className="evidence-checklist-block">
                    {tech.evidenceChecklist.map((check, cIdx) => (
                      <div key={cIdx} className={`checklist-item ${check.status === 'FOUND' ? 'found' : 'not-found'}`}>
                        <span className="check-icon">{check.status === 'FOUND' ? '✓' : '○'}</span>
                        <div className="check-text-group">
                          <span className="check-label">{check.label}</span>
                          {/* We don't render the details to keep it compact, but we could add it as title */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="supporting-files-block">
                  <span className="supporting-files-label">SUPPORTING EVIDENCE:</span>
                  <div className="supporting-files-list">
                    {tech.files?.map((filePath, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        className="file-pill"
                        onClick={() => onSelectFile && onSelectFile(filePath)}
                        title="Click to inspect file evidence"
                      >
                        <span className="check-mark">✓</span>
                        <code>{filePath}</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: ARCHITECTURE RELATIONSHIPS */}
      {activeTab === 'relationships' && (
        <div className="relationships-list">
          {relationships.length === 0 ? (
            <div className="empty-state">No direct file-to-file relationships extracted.</div>
          ) : (
            relationships.map((rel, idx) => (
              <div key={idx} className="relationship-card">
                <div className="rel-flow">
                  <button
                    type="button"
                    className="rel-node source-node"
                    onClick={() => onSelectFile && onSelectFile(rel.from)}
                  >
                    <code>{rel.from}</code>
                  </button>

                  <div className="rel-arrow">
                    <span className="rel-action-label">{rel.relationship}</span>
                    <span className="arrow-graphic">──────►</span>
                  </div>

                  <button
                    type="button"
                    className="rel-node target-node"
                    onClick={() => rel.to?.includes('/') && onSelectFile && onSelectFile(rel.to)}
                  >
                    <code>{rel.to}</code>
                  </button>
                </div>

                <div className="rel-meta">
                  <span className="source-label">EVIDENCE SOURCE:</span>
                  <button
                    type="button"
                    className="rel-evidence-file"
                    onClick={() => onSelectFile && onSelectFile(rel.evidenceFile)}
                  >
                    <code>{rel.evidenceFile}</code>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
