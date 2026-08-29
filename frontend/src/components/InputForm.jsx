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

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <div className="input-group">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/facebook/react"
          disabled={isLoading}
          className="input-field"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? 'Analyzing...' : 'Analyze →'}
        </button>
      </div>

      <p className="hint-text">
        Try a public GitHub repository, e.g. facebook/react
      </p>
    </form>
  )
}