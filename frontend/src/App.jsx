import { useState } from 'react'
import InputForm from './components/InputForm'
import ResultDisplay from './components/ResultDisplay'
import './App.css'

function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleExplain = async (url) => {
    setLoading(true)
    setError(null)

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

      const response = await fetch(`${apiUrl}/api/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to analyze repository')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-mark">RQ</span>
          <span>Repo IQ</span>
        </div>

        <div className="nav-links">
          <a href="#features">Capabilities</a>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </nav>

      <main>
        {!result && (
          <section className="hero">
            <div className="eyebrow">
              <span className="status-dot"></span>
              REPOSITORY INTELLIGENCE
            </div>

            <h1>
              Understand a repository
              <br />
              <span>without reading it line by line.</span>
            </h1>

            <p className="hero-description">
              Analyze a GitHub repository and get its architecture,
              dependencies, setup instructions and technical context
              in one place.
            </p>

            <InputForm
              onSubmit={handleExplain}
              isLoading={loading}
            />

            <div className="hero-note">
              <span>PUBLIC REPOSITORIES</span>
              <span>·</span>
              <span>ARCHITECTURE</span>
              <span>·</span>
              <span>DEPENDENCIES</span>
              <span>·</span>
              <span>SETUP</span>
            </div>

            {error && (
              <div className="error-box">
                <strong>Analysis failed</strong>
                <span>{error}</span>
              </div>
            )}
          </section>
        )}

        {loading && (
          <div className="analysis-state">
            <div className="loader-line"></div>
            <p>Reading repository structure...</p>
          </div>
        )}

        {result && (
          <section className="results-wrapper">
            <button
              className="back-button"
              onClick={() => setResult(null)}
            >
              ← Analyze another repository
            </button>

            <ResultDisplay data={result} />
          </section>
        )}
      </main>

      {!result && (
        <section id="features" className="capabilities">
          <div className="capability">
            <span className="capability-number">01</span>
            <div>
              <h3>Architecture</h3>
              <p>
                See how the repository is structured and how its
                major parts interact.
              </p>
            </div>
          </div>

          <div className="capability">
            <span className="capability-number">02</span>
            <div>
              <h3>Dependencies</h3>
              <p>
                Understand the libraries, frameworks and relationships
                that power the project.
              </p>
            </div>
          </div>

          <div className="capability">
            <span className="capability-number">03</span>
            <div>
              <h3>Setup</h3>
              <p>
                Get concise instructions for installing and running
                the repository locally.
              </p>
            </div>
          </div>
        </section>
      )}

      <footer>
        <span>REPO IQ</span>
        <span>Repository intelligence for developers.</span>
      </footer>
    </div>
  )
}

export default App