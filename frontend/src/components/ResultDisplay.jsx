import { useState } from 'react'
import EvidenceSection from './EvidenceSection'
import MermaidViewer from './MermaidViewer'
import FileInspectorModal from './FileInspectorModal'
import HealthReportSection from './HealthReportSection'
import './ResultDisplay.css'

export default function ResultDisplay({ data }) {
  const [selectedFile, setSelectedFile] = useState(null)

  if (!data) return null

  const {
    projectName = 'Repository',
    url = '',
    repository = {},
    stats = {},
    techStack = [],
    description = '',
    components = '',
    diagram = '',
    setupGuide = '',
    evidence = null,
    healthReport = null,
    generatedAt = ''
  } = data

  const activeHealthReport = healthReport || evidence?.healthReport
  const relationships = evidence?.relationships || []

  return (
    <div className="result-display">
      {/* REPOSITORY HEADER & METADATA */}
      <div className="repo-header">
        <div className="repo-header-top">
          <div className="repo-identity">
            <span className="repo-badge">CODEBASE INTELLIGENCE</span>
            <h2>{repository.fullName || projectName}</h2>
            {repository.description && (
              <p className="repo-tagline">{repository.description}</p>
            )}
          </div>

          <a 
            href={url} 
            target="_blank" 
            rel="noreferrer"
            className="repo-external-link"
          >
            <span>View on GitHub</span>
            <span className="external-arrow">↗</span>
          </a>
        </div>

        {/* METADATA STRIP */}
        <div className="repo-meta-strip">
          {repository.language && (
            <div className="meta-item">
              <span className="meta-label">LANGUAGE</span>
              <span className="meta-value">{repository.language}</span>
            </div>
          )}
          {repository.defaultBranch && (
            <div className="meta-item">
              <span className="meta-label">BRANCH</span>
              <span className="meta-value">{repository.defaultBranch}</span>
            </div>
          )}
          {stats.totalScannedFiles !== undefined && (
            <div className="meta-item">
              <span className="meta-label">SCANNED FILES</span>
              <span className="meta-value">{stats.filteredRelevantFiles || stats.totalScannedFiles}</span>
            </div>
          )}
          {stats.totalScannedDirectories !== undefined && (
            <div className="meta-item">
              <span className="meta-label">DIRECTORIES</span>
              <span className="meta-value">{stats.totalScannedDirectories}</span>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-label">ANALYSIS STATUS</span>
            <span className="meta-value verified-status">✓ EVIDENCE GROUNDED</span>
          </div>
        </div>
      </div>

      {/* STAGE 5: REPOSITORY HEALTH & DRIFT REPORT */}
      {activeHealthReport && (
        <HealthReportSection 
          healthReport={activeHealthReport} 
          data={data} 
        />
      )}

      {/* TECH STACK BADGES */}
      {techStack && techStack.length > 0 && (
        <section className="result-section tech-stack-section">
          <div className="section-header-row">
            <div className="section-header-title">
              <span className="section-number">01</span>
              <h3>Verified Tech Stack</h3>
            </div>
            <span className="section-evidence-tag">Grounded in Package & Code Evidence</span>
          </div>

          <div className="tech-stack">
            {techStack.map((tech, idx) => (
              <span key={idx} className="tech-badge">
                <span className="tech-dot"></span>
                {tech}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* EVIDENCE SYSTEM SECTION */}
      {evidence && (
        <EvidenceSection 
          evidence={evidence} 
          onSelectFile={(filePath) => setSelectedFile(filePath)} 
        />
      )}

      {/* ARCHITECTURE SUMMARY */}
      {description && (
        <section className="result-section">
          <div className="section-header-row">
            <div className="section-header-title">
              <span className="section-number">02</span>
              <h3>Architecture Overview</h3>
            </div>
          </div>
          <p className="section-content">{description}</p>
        </section>
      )}

      {/* INTERACTIVE MERMAID ARCHITECTURE GRAPH */}
      <section className="result-section diagram-section">
        <div className="section-header-row">
          <div className="section-header-title">
            <span className="section-number">03</span>
            <h3>Architecture Dependency Graph</h3>
          </div>
          <span className="section-evidence-tag">Rendered from Verified Connections</span>
        </div>

        <MermaidViewer 
          relationships={relationships} 
          fallbackDiagram={diagram} 
        />
      </section>

      {/* COMPONENTS BREAKDOWN */}
      {components && (
        <section className="result-section">
          <div className="section-header-row">
            <div className="section-header-title">
              <span className="section-number">04</span>
              <h3>Codebase Components</h3>
            </div>
            <span className="section-evidence-tag">Scanned Structure</span>
          </div>
          <pre className="code-block">{components}</pre>
        </section>
      )}

      {/* SETUP GUIDE */}
      {setupGuide && (
        <section className="result-section">
          <div className="section-header-row">
            <div className="section-header-title">
              <span className="section-number">05</span>
              <h3>Installation & Setup Guide</h3>
            </div>
            <span className="section-evidence-tag">Extracted Manifest Scripts</span>
          </div>
          <pre className="code-block">{setupGuide}</pre>
        </section>
      )}

      {/* FOOTER METADATA */}
      <div className="result-footer-meta">
        <span>Analysis generated on {new Date(generatedAt || Date.now()).toLocaleString()}</span>
        <span>REPO IQ · Codebase Intelligence Engine</span>
      </div>

      {/* FILE INSPECTOR DRAWER */}
      {selectedFile && (
        <FileInspectorModal
          filePath={selectedFile}
          data={data}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  )
}