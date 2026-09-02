import { useState, useEffect } from 'react'
import './ApiKeyModal.css'

const STORAGE_KEY = 'repoiq_groq_api_key'

export function getStoredApiKey() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function clearStoredApiKey() {
  localStorage.removeItem(STORAGE_KEY)
}

export default function ApiKeyModal({ onKeySet }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  const handleSave = async () => {
    const trimmed = key.trim()
    if (!trimmed.startsWith('gsk_')) {
      setError('Groq API keys start with "gsk_". Please check your key.')
      return
    }
    setError('')
    setTesting(true)
    try {
      // Quick validation: call Groq models endpoint
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${trimmed}` }
      })
      if (!res.ok) {
        setError('Invalid API key. Please double-check and try again.')
        setTesting(false)
        return
      }
      localStorage.setItem(STORAGE_KEY, trimmed)
      onKeySet(trimmed)
    } catch {
      setError('Could not validate key. Check your internet connection.')
    }
    setTesting(false)
  }

  return (
    <div className="apikey-overlay">
      <div className="apikey-modal">
        <div className="apikey-icon">🔑</div>
        <h2 className="apikey-title">Connect Your Groq API Key</h2>
        <p className="apikey-desc">
          REPO IQ uses Groq's AI to analyse repositories. Each user needs their own
          free API key — your key is stored only in your browser and sent directly to
          the server for this session.
        </p>

        <div className="apikey-steps">
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
            className="apikey-step-link"
          >
            1. Create a free account at console.groq.com →
          </a>
          <span className="apikey-step-text">2. Generate an API key (it starts with <code>gsk_</code>)</span>
          <span className="apikey-step-text">3. Paste it below</span>
        </div>

        <div className="apikey-input-row">
          <input
            className="apikey-input"
            type="password"
            placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button
            className="apikey-save-btn"
            onClick={handleSave}
            disabled={testing || !key.trim()}
          >
            {testing ? 'Validating…' : 'Connect'}
          </button>
        </div>

        {error && <p className="apikey-error">{error}</p>}

        <p className="apikey-privacy">
          🔒 Your key never leaves your browser session. It is not stored on any server.
        </p>
      </div>
    </div>
  )
}
