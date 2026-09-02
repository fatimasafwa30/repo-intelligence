/**
 * rateLimit.js
 * Lightweight in-memory rate limiter and request cache.
 * No external dependencies required.
 */

// ─────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────
const rateLimitStore = new Map() // ip → { windowStart, count }

/**
 * Returns true if the IP is allowed, false if rate-limited.
 * @param {string} ip
 * @param {number} maxRequests  – allowed requests per window
 * @param {number} windowMs     – window size in milliseconds
 */
export function checkRateLimit(ip, maxRequests, windowMs) {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(ip, { windowStart: now, count: 1 })
    return true
  }

  if (entry.count >= maxRequests) return false

  entry.count++
  return true
}

// Clean up stale IPs every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  const MAX_WINDOW = 60 * 60 * 1000 // 1 hour
  for (const [ip, entry] of rateLimitStore) {
    if (now - entry.windowStart > MAX_WINDOW) rateLimitStore.delete(ip)
  }
}, 10 * 60 * 1000)

// ─────────────────────────────────────────────
// ANALYSIS CACHE  (prevents re-burning tokens for same repo)
// ─────────────────────────────────────────────
const analysisCache = new Map() // "owner/repo" → { data, cachedAt }

const CACHE_TTL_MS    = 2 * 60 * 60 * 1000  // 2 hours
const CACHE_MAX_SIZE  = 50                   // max repos cached at once

export function getCachedAnalysis(owner, repo) {
  const key = `${owner}/${repo}`
  const entry = analysisCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    analysisCache.delete(key)
    return null
  }
  return entry.data
}

export function setCachedAnalysis(owner, repo, data) {
  const key = `${owner}/${repo}`

  // Evict oldest entry if at capacity
  if (analysisCache.size >= CACHE_MAX_SIZE && !analysisCache.has(key)) {
    const oldest = [...analysisCache.entries()]
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0]
    if (oldest) analysisCache.delete(oldest[0])
  }

  analysisCache.set(key, { data, cachedAt: Date.now() })
}

// ─────────────────────────────────────────────
// ERROR SANITIZER
// Strips Groq internals (API keys, org IDs, model paths)
// and returns safe, user-friendly messages.
// ─────────────────────────────────────────────
export function sanitizeError(rawMessage) {
  if (!rawMessage) return 'Analysis service is temporarily unavailable. Please try again later.'

  const msg = String(rawMessage)

  // Groq rate limit / quota exhaustion
  if (msg.includes('Rate limit') || msg.includes('rate_limit') || msg.includes('TPM') || msg.includes('TPD')) {
    // Extract retry time if present
    const retryMatch = msg.match(/try again in ([0-9]+m[0-9.]+s|[0-9.]+s)/)
    const retryHint = retryMatch ? ` Service will be available again in approximately ${retryMatch[1]}.` : ''
    return `The analysis service is currently busy due to high demand.${retryHint} Please try again shortly.`
  }

  // Groq model decommissioned / not found
  if (msg.includes('decommissioned') || msg.includes('does not exist')) {
    return 'Analysis service configuration error. Please contact the site administrator.'
  }

  // Groq server overloaded
  if (msg.includes('overloaded') || msg.includes('503') || msg.includes('502')) {
    return 'The AI analysis service is temporarily overloaded. Please try again in a moment.'
  }

  // Generic AI/API failure
  if (msg.includes('AI analysis failed') || msg.includes('AI interrogation failed')) {
    return 'AI analysis could not be completed at this time. Please try again shortly.'
  }

  // GitHub API errors — safe to pass through
  if (msg.includes('GitHub') || msg.includes('Not Found') || msg.includes('Invalid GitHub URL')) {
    return msg
  }

  // Generic server errors — strip anything that looks like an API key or org ID
  const stripped = msg
    .replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED]')
    .replace(/org_[A-Za-z0-9]+/g, '[REDACTED]')
    .replace(/Bearer [A-Za-z0-9._-]+/g, 'Bearer [REDACTED]')

  // If it's a short, safe message, return it
  if (stripped.length < 120 && !stripped.includes('model') && !stripped.includes('token')) {
    return stripped
  }

  return 'Analysis service is temporarily unavailable. Please try again later.'
}
