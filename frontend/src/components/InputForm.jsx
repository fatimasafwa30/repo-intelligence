import { useState } from 'react'
import './InputForm.css'

export default function InputForm({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmit(url.trim())
    }
  }

  const handleQuickSample = (sampleUrl) => {
    setUrl(sampleUrl)
    onSubmit(sampleUrl)
  }

  return (
    <div className="command-input-container">
      <form onSubmit={handleSubmit} className="command-form">
        <div className="command-box">
          <div className="command-prefix">
            <span className="prompt-symbol">↗</span>
            <span className="prompt-host">github.com/</span>
          </div>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="owner/repository or full GitHub URL"
            disabled={isLoading}
            className="command-field"
            spellCheck="false"
            autoCapitalize="none"
            autoCorrect="off"
          />

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="command-submit-btn"
          >
            {isLoading ? (
              <span className="btn-loading-state">
                <span className="btn-spinner"></span>
                <span>ANALYZING...</span>
              </span>
            ) : (
              <span>ANALYZE →</span>
            )}
          </button>
        </div>
      </form>

      {/* QUICK TEST EXAMPLES */}
      <div className="quick-samples-row">
        <span className="samples-label">QUICK VERIFICATION:</span>
        <div className="sample-buttons">
          <button
            type="button"
            className="sample-btn"
            onClick={() => handleQuickSample('https://github.com/facebook/react')}
            disabled={isLoading}
          >
            <code>facebook/react</code>
            <span className="sample-tag">React UI Library</span>
          </button>
          <button
            type="button"
            className="sample-btn"
            onClick={() => handleQuickSample('https://github.com/expressjs/express')}
            disabled={isLoading}
          >
            <code>expressjs/express</code>
            <span className="sample-tag">Node API Framework</span>
          </button>
        </div>
      </div>
    </div>
  )
}