import { useState } from 'react'
import './HealthReportSection.css'

export default function HealthReportSection({ healthReport, data }) {
  const [showFixModal, setShowFixModal] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!healthReport) return null

  const {
    accuracyScore = 100,
    statusLabel = 'EXCELLENT ALIGNMENT',
    statusGrade = 'A',
    verifiedCount = 0,
    partialCount = 0,
    notFoundCount = 0,
    totalClaims = 0,
    profile = {},
    footprint = {},
    scanCoverage = {},
    driftItems = [],
    suggestedReadmeMarkdown = ''
  } = healthReport

  const handleCopy = () => {
    if (suggestedReadmeMarkdown) {
      navigator.clipboard.writeText(suggestedReadmeMarkdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getScoreColorClass = (score) => {
    if (score >= 90) return 'score-excellent'
    if (score >= 70) return 'score-moderate'
    return 'score-poor'
  }

  return (
    <section className="health-report-section">
      <div className="health-header-row">
        <div className="health-title-group">
          <span className="health-badge">INTELLIGENCE REPORT · DOCUMENTATION AUDIT</span>
          <h2>Repository Intelligence · Documentation Audit</h2>
        </div>

        <button
          type="button"
          className="readme-sync-btn"
          onClick={() => setShowFixModal(true)}
        >
          <span>⚡ Generate README Sync Fix</span>
        </button>
      </div>

      {/* ACCURACY SCORE & SUMMARY CARD */}
      <div className="accuracy-card">
        <div className="score-block">
          <div className={`score-circle ${getScoreColorClass(accuracyScore)}`}>
            <span className="score-number">{accuracyScore}%</span>
            <span className="score-grade">ALIGNMENT</span>
          </div>
          <div className="score-text">
            <span className="score-label">README ↔ CODE ALIGNMENT</span>
            <h3 className="score-status">{statusLabel}</h3>
            <p className="score-desc">
              Percentage of README claims verified against scanned repository evidence. This measures documentation accuracy, not code quality.
              <br/><br/>
              {totalClaims > 0 
                ? `${verifiedCount} of ${totalClaims} documented technical claims strictly confirmed by scanned repository code evidence.`
                : 'No explicit technical claims detected in documentation.'}
            </p>
          </div>
        </div>

        <div className="claims-meter-bar">
          <div 
            className="meter-fill verified" 
            style={{ width: `${totalClaims ? (verifiedCount / totalClaims) * 100 : 100}%` }}
            title={`Verified: ${verifiedCount}`}
          />
          <div 
            className="meter-fill partial" 
            style={{ width: `${totalClaims ? (partialCount / totalClaims) * 100 : 0}%` }}
            title={`Partial: ${partialCount}`}
          />
          <div 
            className="meter-fill not-found" 
            style={{ width: `${totalClaims ? (notFoundCount / totalClaims) * 100 : 0}%` }}
            title={`Not Found: ${notFoundCount}`}
          />
        </div>

        <div className="claims-stat-pills">
          <span className="stat-pill verified">✓ {verifiedCount} Verified Claims</span>
          <span className="stat-pill partial">⚠ {partialCount} Partial Matches</span>
          <span className="stat-pill not-found">✕ {notFoundCount} Mismatches / Undocumented</span>
        </div>
      </div>

      {/* ARCHITECTURAL PROFILE GRID */}
      <div className="health-grid">
        <div className="health-subcard profile-card">
          <span className="subcard-label">VERIFIED ARCHITECTURAL PROFILE</span>
          <div className="profile-specs-grid">
            <div className="spec-row">
              <span className="spec-name">FRONTEND</span>
              <span className="spec-val">{profile.frontend || 'Standard Web'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">DATABASE</span>
              <span className="spec-val">{profile.database || 'None / Static'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">AI SERVICES</span>
              <span className="spec-val">{profile.ai || 'None'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">AUTHENTICATION</span>
              <span className="spec-val">{profile.auth || 'None'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">STYLING</span>
              <span className="spec-val">{profile.styling || 'CSS'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">DEPLOYMENT</span>
              <span className="spec-val">{profile.deployment || 'Standard Cloud'}</span>
            </div>
          </div>
        </div>

        {/* CODEBASE FOOTPRINT */}
        <div className="health-subcard footprint-card">
          <span className="subcard-label">CODEBASE FOOTPRINT</span>
          <div className="footprint-stats-grid">
            <div className="fp-stat">
              <span className="fp-num">{footprint.totalFilesScanned || 0}</span>
              <span className="fp-name">Total Files Scanned</span>
            </div>
            <div className="fp-stat">
              <span className="fp-num">{footprint.componentsCount || 0}</span>
              <span className="fp-name">UI Components</span>
            </div>
            <div className="fp-stat">
              <span className="fp-num">{footprint.servicesCount || 0}</span>
              <span className="fp-name">Services / Contexts</span>
            </div>
            <div className="fp-stat">
              <span className="fp-num">{footprint.schemasCount || footprint.modelsCount || 0}</span>
              <span className="fp-name">Schemas / Models</span>
            </div>
          </div>
        </div>
        
        {/* SCAN COVERAGE */}
        <div className="health-subcard footprint-card">
          <span className="subcard-label">SCAN COVERAGE (REPO IQ ENGINE)</span>
          <div className="footprint-stats-grid">
            <div className="fp-stat">
              <span className="fp-num">{scanCoverage.repositoryFilesDiscovered || 0}</span>
              <span className="fp-name">Relevant Files Discovered</span>
            </div>
            <div className="fp-stat">
              <span className="fp-num">{scanCoverage.manifestFilesInspected || 0}</span>
              <span className="fp-name">Manifests Inspected</span>
            </div>
            <div className="fp-stat">
              <span className="fp-num">{scanCoverage.sourceFilesInspected || 0}</span>
              <span className="fp-name">Source Files Inspected</span>
            </div>
            <div className="fp-stat">
              <span className="fp-num">{scanCoverage.coreFilesInspected || 0}</span>
              <span className="fp-name">Core Files Fully Analyzed</span>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENTATION DRIFT ALERTS */}
      <div className="drift-alerts-container">
        <div className="drift-header">
          <span className="drift-title">{driftItems?.length || 0} CLAIMS REQUIRE REVIEW</span>
          <span className="drift-subtext">Differences detected between documentation assertions and code truth</span>
        </div>

        {driftItems && driftItems.length > 0 ? (
          <div className="drift-items-list">
            {driftItems.map((item, idx) => (
              <div key={idx} className={`drift-card ${item.severity}`}>
                <div className="drift-card-header">
                  <span className={`drift-type-badge ${item.type}`}>
                    {item.type === 'mismatch' ? '⚠ MISMATCH' : item.type === 'undocumented_feature' ? '＋ UNDOCUMENTED' : '⚠ PARTIAL DRIFT'}
                  </span>
                  <span className="drift-claim-title">{item.claim}</span>
                </div>

                <div className="drift-comparison">
                  <div className="comparison-side doc">
                    <span className="side-label">README ASSERTION:</span>
                    <p>{item.documented}</p>
                  </div>
                  <div className="comparison-arrow">→</div>
                  <div className="comparison-side reality">
                    <span className="side-label">CODE REALITY:</span>
                    <p>{item.reality}</p>
                  </div>
                </div>

                <div className="drift-suggestion">
                  <span className="sugg-label">RECOMMENDATION:</span>
                  <span className="sugg-text">{item.suggestion}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-drift-card">
            <span className="no-drift-icon">✓</span>
            <div className="no-drift-text">
              <h4>No Documentation Drift Detected</h4>
              <p>All audited technical claims in the repository README are strictly supported by inspected code evidence.</p>
            </div>
          </div>
        )}
      </div>

      {/* README SYNC MODAL */}
      {showFixModal && (
        <div className="fix-modal-backdrop" onClick={() => setShowFixModal(false)}>
          <div className="fix-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fix-modal-header">
              <div className="fix-title-group">
                <span className="fix-badge">EVIDENCE-GROUNDED REMEDIATION</span>
                <h3>Suggested README Tech Stack Update</h3>
              </div>
              <button 
                type="button" 
                className="fix-close-btn"
                onClick={() => setShowFixModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="fix-modal-body">
              <p className="fix-intro">
                Paste this evidence-verified Markdown snippet into your repository's <code>README.md</code> to ensure complete alignment with implementation:
              </p>

              <div className="fix-code-wrapper">
                <pre className="fix-code-block">{suggestedReadmeMarkdown}</pre>
                <button 
                  type="button" 
                  className={`copy-code-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied to Clipboard!' : 'Copy Markdown'}
                </button>
              </div>

              <div className="fix-modal-footer">
                <span>✓ Generated deterministically from scanned AST dependencies and repository manifests.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
