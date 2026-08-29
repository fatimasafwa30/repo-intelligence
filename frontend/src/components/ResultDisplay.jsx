import { useEffect } from 'react'
import mermaid from 'mermaid'
import './ResultDisplay.css'

export default function ResultDisplay({ data }) {
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'default' })
    mermaid.contentLoaded()
  }, [data])

  return (
    <div className="result-display">
      {/* Repository Header */}
      <div className="repo-header">
        <h2>{data.projectName || 'Repository'}</h2>
        <a 
          href={data.url} 
          target="_blank" 
          rel="noreferrer"
          className="repo-link"
        >
          {data.url}
        </a>
      </div>

      {/* Architecture Section */}
      {data.description && (
        <section className="result-section">
          <h3>📋 Architecture</h3>
          <p className="section-content">{data.description}</p>
        </section>
      )}

      {/* Components Section */}
      {data.components && (
        <section className="result-section">
          <h3>🔧 Components</h3>
          <pre className="code-block">{data.components}</pre>
        </section>
      )}

      {/* Diagram Section */}
      {data.diagram && (
        <section className="result-section">
          <h3>📊 Dependency Diagram</h3>
          <div className="diagram-container">
            <div className="mermaid">{data.diagram}</div>
          </div>
        </section>
      )}

      {/* Setup Guide Section */}
      {data.setupGuide && (
        <section className="result-section">
          <h3>🚀 Setup Guide</h3>
          <pre className="code-block">{data.setupGuide}</pre>
        </section>
      )}

      {/* Tech Stack */}
      {data.techStack && data.techStack.length > 0 && (
        <section className="result-section">
          <h3>💻 Tech Stack</h3>
          <div className="tech-stack">
            {data.techStack.map((tech, idx) => (
              <span key={idx} className="tech-badge">{tech}</span>
            ))}
          </div>
        </section>
      )}

      {/* Generated At */}
      <p className="generated-at">
        Generated at {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  )
}