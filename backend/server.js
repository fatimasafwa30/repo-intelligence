import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Octokit } from '@octokit/rest'
import { analyzeRepository, repositoryCache } from './services/analyzer.js'
import { askRepository } from './services/forensicInterrogator.js'
import {
  checkRateLimit,
  getCachedAnalysis,
  setCachedAnalysis,
  sanitizeError
} from './services/rateLimit.js'

import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Try backend/.env then root .env
dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '50kb' })) // reject oversized request bodies

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

function parseGitHubUrl(url) {
  try {
    const cleaned = url.trim().replace(/\/+$/, '')
    const match = cleaned.match(/(?:github\.com\/|^)([^/]+)\/([^/]+)/)
    if (!match) throw new Error('Invalid format')
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '')
    }
  } catch {
    throw new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo')
  }
}

// ─────────────────────────────────────────────
// RATE LIMIT CONFIG
// ─────────────────────────────────────────────
const ANALYZE_LIMIT  = { maxRequests: 5,  windowMs: 15 * 60 * 1000 } // 5 per 15 min
const ASK_LIMIT      = { maxRequests: 20, windowMs: 15 * 60 * 1000 } // 20 per 15 min

// ─────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────

// POST /api/explain  — full repository analysis
app.post(['/api/explain', '/explain'], async (req, res) => {
  try {
    const ip = getClientIp(req)

    // 1. IP rate limiting
    if (!checkRateLimit(ip, ANALYZE_LIMIT.maxRequests, ANALYZE_LIMIT.windowMs)) {
      return res.status(429).json({
        error: 'Too many analysis requests. Please wait a few minutes before trying again.'
      })
    }

    const { url } = req.body
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'GitHub URL is required.' })
    }

    const { owner, repo } = parseGitHubUrl(url)

    // 2. Serve from cache if available (saves tokens, prevents abuse)
    const cached = getCachedAnalysis(owner, repo)
    if (cached) {
      console.log(`[Cache HIT] ${owner}/${repo}`)
      return res.json({ ...cached, fromCache: true })
    }

    // 3. Run full analysis
    console.log(`[Analyze] ${owner}/${repo} [ip: ${ip}]`)
    const result = await analyzeRepository(octokit, owner, repo, process.env.GROQ_API_KEY)

    // 4. Store in cache
    setCachedAnalysis(owner, repo, result)

    res.json(result)
  } catch (err) {
    console.error('[/api/explain error]', err.message)
    res.status(500).json({ error: sanitizeError(err.message) })
  }
})

// POST /api/ask  — forensic repository interrogation
app.post(['/api/ask', '/ask'], async (req, res) => {
  try {
    const ip = getClientIp(req)

    // 1. IP rate limiting
    if (!checkRateLimit(ip, ASK_LIMIT.maxRequests, ASK_LIMIT.windowMs)) {
      return res.status(429).json({
        error: 'Too many questions submitted. Please wait a few minutes before asking again.'
      })
    }

    const { url, question } = req.body
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'GitHub URL is required.' })
    }
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'A question is required.' })
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'Question is too long (max 500 characters).' })
    }

    const { owner, repo } = parseGitHubUrl(url)
    console.log(`[Ask] ${owner}/${repo} — "${question.slice(0, 60)}" [ip: ${ip}]`)

    const result = await askRepository(octokit, owner, repo, question.trim(), process.env.GROQ_API_KEY)
    res.json(result)
  } catch (err) {
    console.error('[/api/ask error]', err.message)
    res.status(500).json({ error: sanitizeError(err.message) })
  }
})

// GET /health and /api/health
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ─────────────────────────────────────────────
// START (local only — on Vercel, app is exported as a serverless handler)
// ─────────────────────────────────────────────
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'))
if (!process.env.VERCEL && isDirectRun) {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`)
    console.log(`📋 API: POST http://localhost:${PORT}/api/explain`)
    console.log(`📋 API: POST http://localhost:${PORT}/api/ask`)
    console.log(`❤️  Health: GET http://localhost:${PORT}/health`)
  })
}

export default app