import { useState } from 'react'
import InputForm from './components/InputForm'
import ResultDisplay from './components/ResultDisplay'
import './App.css'

function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleExplain = async (url) => {
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL !== undefined
        ? import.meta.env.VITE_API_URL
        : (import.meta.env.DEV ? 'http://localhost:5000' : '')

      const response = await fetch(`${apiUrl}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`
        try {
          const errData = await response.json()
          if (errData?.error) {
            errorMessage = errData.error
          }
        } catch {
          if (response.statusText) {
            errorMessage = `Server error: ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      setResult(data)
    } catch (err) {
      if (err.name === 'TypeError' && (err.message?.includes('fetch') || err.message?.includes('NetworkError'))) {
        const apiUrl = import.meta.env.VITE_API_URL !== undefined
          ? import.meta.env.VITE_API_URL
          : (import.meta.env.DEV ? 'http://localhost:5000' : '')
        const connTarget = apiUrl || 'the API server'
        setError(`Cannot connect to backend server at ${connTarget}. Please ensure the backend server is running and reachable.`)
      } else {
        setError(err.message || 'Failed to analyze repository')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="brand">
          <span className="brand-mark">RQ</span>
          <span className="brand-title">REPO IQ</span>
          <span className="brand-version">ENGINE v1.2</span>
        </div>

        <div className="nav-meta">
          <span className="engine-status">
            <span className="status-dot"></span>
            <span>EVIDENCE GROUNDED</span>
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="nav-gh-link"
          >
            GitHub ↗
          </a>
        </div>
      </nav>

      <main>
        {!result && (
          <div className="landing-container">
            {/* HERO SECTION */}
            <section className="hero">
              <div className="eyebrow">
                <span className="eyebrow-line"></span>
                <span>REPOSITORY INTELLIGENCE</span>
              </div>

              <h1 className="hero-heading">
                Understand a repository
                <br />
                <span className="hero-subheading">without reading it line by line.</span>
              </h1>

              <p className="hero-description">
                REPO IQ traces architecture, dependencies and documentation claims back to evidence found in the actual codebase.
              </p>

              {/* COMMAND SEARCH BAR */}
              <InputForm
                onSubmit={handleExplain}
                isLoading={loading}
              />

              {/* CAPABILITY METADATA STRIP */}
              <div className="hero-meta-strip">
                <span>PUBLIC REPOSITORIES</span>
                <span className="meta-sep">/</span>
                <span>CODE EVIDENCE</span>
                <span className="meta-sep">/</span>
                <span>ARCHITECTURE</span>
                <span className="meta-sep">/</span>
                <span>DOCUMENTATION AUDIT</span>
                <span className="meta-sep">/</span>
                <span>DRIFT DETECTION</span>
              </div>

              {error && (
                <div className="error-box">
                  <div className="error-header">
                    <span className="error-icon">✕</span>
                    <strong>ANALYSIS FAILED</strong>
                  </div>
                  <p className="error-message">{error}</p>
                </div>
              )}
            </section>

            {/* HORIZONTAL EVIDENCE PIPELINE */}
            <section className="pipeline-section">
              <div className="section-label-bar">
                <span className="sec-tag">INSPECTION PIPELINE</span>
                <span className="sec-title">HOW REPO IQ AUDITS CODEBASES</span>
              </div>

              <div className="pipeline-steps-grid">
                <div className="pipe-step">
                  <div className="step-num">01</div>
                  <h4>REPOSITORY SCAN</h4>
                  <p>Recursively traverses GitHub tree topology in 1 single call to catalog all files and structure.</p>
                </div>

                <div className="pipe-arrow">→</div>

                <div className="pipe-step">
                  <div className="step-num">02</div>
                  <h4>SOURCE INSPECTION</h4>
                  <p>Safely fetches package manifests, entry points, schemas, routes, and core controllers.</p>
                </div>

                <div className="pipe-arrow">→</div>

                <div className="pipe-step">
                  <div className="step-num">03</div>
                  <h4>CODE EVIDENCE</h4>
                  <p>Extracts exact 1-indexed line numbers, imports, and AST-level component relationships.</p>
                </div>

                <div className="pipe-arrow">→</div>

                <div className="pipe-step">
                  <div className="step-num">04</div>
                  <h4>CLAIM AUDIT</h4>
                  <p>Cross-references README claims against actual code reality to identify matches and drift.</p>
                </div>

                <div className="pipe-arrow">→</div>

                <div className="pipe-step">
                  <div className="step-num">05</div>
                  <h4>HEALTH & FIXES</h4>
                  <p>Calculates documentation accuracy scores and generates deterministic README remediation diffs.</p>
                </div>
              </div>
            </section>

            {/* NEUTRAL VERIFICATION MODEL SECTION */}
            <section className="forensic-showcase-section">
              <div className="section-label-bar">
                <span className="sec-tag">EVIDENCE VERIFICATION MODEL</span>
                <span className="sec-title">CLAIM ➔ SEARCHED CODE EVIDENCE ➔ VERDICT</span>
              </div>

              <div className="forensic-card">
                <div className="forensic-step claim-step">
                  <div className="step-tag-row">
                    <span className="step-tag">01 · EXTRACT CLAIMS</span>
                    <span className="step-cat">DOCUMENTATION PARSER</span>
                  </div>
                  <div className="model-desc-box">
                    <p className="model-desc-text">
                      Technical claims (frameworks, databases, authentication, AI models, APIs, and cloud services) are parsed from the repository's <code>README.md</code>.
                    </p>
                  </div>
                </div>

                <div className="forensic-connector">
                  <span>↓ SEARCH & CORRELATE</span>
                </div>

                <div className="forensic-step evidence-step">
                  <div className="step-tag-row">
                    <span className="step-tag">02 · SEARCH CODEBASE EVIDENCE</span>
                    <span className="step-cat">EVIDENCE ENGINE</span>
                  </div>
                  <div className="model-desc-box">
                    <p className="model-desc-text">
                      Claims are cross-referenced across scanned package manifests, configuration files, AST import trees, and line-level source code signatures.
                    </p>
                  </div>
                </div>

                <div className="forensic-connector">
                  <span>↓ COMPUTE VERDICT</span>
                </div>

                <div className="forensic-step verdict-step">
                  <div className="step-tag-row">
                    <span className="step-tag">03 · VERDICT & CONFIDENCE</span>
                    <span className="step-cat">ACCURACY & DRIFT</span>
                  </div>
                  <div className="model-desc-box">
                    <p className="model-desc-text">
                      Each technical assertion receives a verified, partial, or drift verdict based strictly on inspected source code truth — with zero hallucinations.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="analysis-state">
            <div className="loader-line"></div>
            <div className="loader-meta">
              <span className="loader-spinner"></span>
              <p>Scanning tree topology and extracting code evidence...</p>
            </div>
          </div>
        )}

        {/* RESULT WORKSPACE */}
        {result && (
          <section className="results-wrapper">
            <div className="results-top-nav">
              <button
                type="button"
                className="back-button"
                onClick={() => setResult(null)}
              >
                ← Analyze another repository
              </button>

              <div className="workspace-tag">
                <span className="live-dot"></span>
                <span>INVESTIGATION WORKSPACE</span>
              </div>
            </div>

            <ResultDisplay data={result} />
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer>
        <div className="footer-left">
          <span>REPO IQ</span>
          <span className="footer-sep">/</span>
          <span>EVIDENCE-FIRST CODEBASE AUDITING</span>
          <span className="footer-sep">/</span>
          <span>ZERO FABRICATED METRICS</span>
        </div>
        <div className="footer-right">
          <span>ENGINE STATUS: OPERATIONAL</span>
        </div>
      </footer>
    </div>
  )
}

export default App