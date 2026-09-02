import { useState, useRef, useEffect } from 'react'
import './ForensicChat.css'

const SUGGESTED_QUESTIONS = [
  "Where is the database initialized?",
  "How does authentication work?",
  "Where are API routes defined?",
  "How does data flow from frontend to backend?"
]

export default function ForensicChat({ url, onSelectFile, isOpen, onClose }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  
  const endOfMessagesRef = useRef(null)

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory, loading])

  const handleAsk = async (qText) => {
    const textToAsk = qText || question
    if (!textToAsk.trim()) return

    const newQuery = { role: 'user', content: textToAsk }
    setChatHistory(prev => [...prev, newQuery])
    setQuestion('')
    setLoading(true)
    setError(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL !== undefined
        ? import.meta.env.VITE_API_URL
        : (import.meta.env.DEV ? 'http://localhost:5000' : '')
      const response = await fetch(`${apiUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, question: textToAsk }),
      })

      if (!response.ok) {
        // Read the sanitized error message from the server body
        let message = `Request failed (${response.status})`
        try {
          const errData = await response.json()
          if (errData?.error) message = errData.error
        } catch { /* body not JSON, keep default */ }
        throw new Error(message)
      }

      const data = await response.json()
      
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'system', 
          ...data 
        }
      ])
    } catch (err) {
      const isNetworkError = err.name === 'TypeError' && (err.message?.includes('fetch') || err.message?.includes('NetworkError'))
      const apiUrl = import.meta.env.VITE_API_URL !== undefined
        ? import.meta.env.VITE_API_URL
        : (import.meta.env.DEV ? 'http://localhost:5000' : '')
      const connTarget = apiUrl || 'the API server'
      const msg = isNetworkError
        ? `Cannot connect to backend server at ${connTarget}. Please ensure the backend server is running and reachable.`
        : (err.message || 'Failed to interrogate repository.')
      setError(msg)
      setChatHistory(prev => [
        ...prev,
        { role: 'system', error: true, content: msg }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCitationClick = (citation) => {
    if (onSelectFile) {
      onSelectFile(citation.file, citation.lineRange)
    }
  }

  if (!isOpen) return null

  return (
    <div className="forensic-chat-panel">
      <div className="fc-header">
        <div className="fc-header-title">
          <h3>ASK REPOSITORY</h3>
          <span className="fc-subtitle">Evidence-grounded repository interrogation</span>
        </div>
        <button className="fc-close-btn" onClick={onClose} title="Close Panel">×</button>
      </div>

      <div className="fc-body">
        {chatHistory.length === 0 && !loading && (
          <div className="fc-empty-state">
            <div className="fc-empty-icon">🔍</div>
            <p className="fc-empty-text">Ask a question to interrogate the codebase.</p>
            <div className="fc-suggestions">
              {SUGGESTED_QUESTIONS.map((sq, i) => (
                <button key={i} className="fc-suggestion-btn" onClick={() => handleAsk(sq)}>
                  {sq}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`fc-message ${msg.role === 'user' ? 'fc-user' : 'fc-system'}`}>
            {msg.role === 'user' ? (
              <div className="fc-user-bubble">
                <span className="fc-label">QUESTION</span>
                <p>{msg.content}</p>
              </div>
            ) : (
              <div className="fc-evidence-trail">
                {msg.error ? (
                  <div className="fc-error-state">
                    <p>{msg.content}</p>
                  </div>
                ) : (
                  <>
                    {/* EVIDENCE SEARCH */}
                    {msg.evidenceSearch && msg.evidenceSearch.length > 0 && (
                      <div className="fc-trail-step">
                        <span className="fc-label">EVIDENCE SEARCH</span>
                        <ul className="fc-file-list">
                          {msg.evidenceSearch.map((f, j) => (
                            <li key={j} className="fc-file-item searching">
                              <span className="fc-icon">○</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* VERIFIED EVIDENCE */}
                    {msg.verifiedFiles && msg.verifiedFiles.length > 0 && (
                      <div className="fc-trail-step">
                        <span className="fc-label">VERIFIED EVIDENCE</span>
                        <ul className="fc-file-list">
                          {msg.verifiedFiles.map((f, j) => (
                            <li key={j} className="fc-file-item verified">
                              <span className="fc-icon">✓</span> {typeof f === 'string' ? f : f.file}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* FINDING / ANSWER */}
                    <div className="fc-trail-step fc-finding-step">
                      <span className="fc-label">{msg.status === 'NOT_FOUND' ? 'NOT FOUND IN SCANNED EVIDENCE' : 'FINDING'}</span>
                      
                      {msg.status === 'NOT_FOUND' ? (
                        <div className="fc-not-found-box">
                          <p>REPO IQ could not find sufficient evidence in the inspected repository files to answer this question.</p>
                          <p className="fc-not-found-sub">No implementation was verified in the scanned evidence.</p>
                        </div>
                      ) : (
                        <div className="fc-answer-text">
                          <p>{msg.answer}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* CITATIONS */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="fc-trail-step">
                        <span className="fc-label">CITATIONS</span>
                        <div className="fc-citations-list">
                          {msg.citations.map((cit, j) => (
                            <button key={j} className="fc-citation-btn" onClick={() => handleCitationClick(cit)}>
                              <span className="fc-cit-file">{cit.file}</span>
                              {cit.lineRange && <span className="fc-cit-line">Lines {cit.lineRange}</span>}
                              {cit.proof && <span className="fc-cit-proof">{cit.proof}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CONFIDENCE */}
                    <div className="fc-trail-step">
                      <span className="fc-label">CONFIDENCE · <span className={`fc-conf-badge fc-conf-${msg.confidence?.toLowerCase()}`}>{msg.confidence}</span></span>
                      {msg.confidenceChecklist && msg.confidenceChecklist.length > 0 && (
                        <ul className="fc-conf-checklist">
                          {msg.confidenceChecklist.map((chk, j) => (
                            <li key={j} className={chk.found ? 'fc-chk-found' : 'fc-chk-miss'}>
                              <span className="fc-icon">{chk.found ? '✓' : '○'}</span> {chk.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="fc-loading-state">
            <span className="fc-label">INVESTIGATING REPOSITORY...</span>
            <div className="fc-spinner"></div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="fc-footer">
        <form 
          className="fc-input-form"
          onSubmit={(e) => { e.preventDefault(); handleAsk(); }}
        >
          <input 
            type="text" 
            placeholder="Interrogate repository..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !question.trim()}>
            INVESTIGATE
          </button>
        </form>
      </div>
    </div>
  )
}
