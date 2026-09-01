import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Octokit } from '@octokit/rest'
import { analyzeRepository } from './services/analyzer.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Initialize GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
})

// Helper: Parse GitHub URL to get owner and repository name
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
    throw new Error('Invalid GitHub URL format. Use format: https://github.com/owner/repo')
  }
}

// ============================================
// API ENDPOINTS
// ============================================

// Main endpoint: Analyze repository with full codebase intelligence
app.post('/api/explain', async (req, res) => {
  try {
    const { url } = req.body

    // Validate input
    if (!url) {
      return res.status(400).json({ error: 'GitHub URL is required' })
    }

    // Parse URL
    const { owner, repo } = parseGitHubUrl(url)

    // Execute full repository scan and intelligence analysis
    console.log(`Starting codebase analysis for: ${owner}/${repo}`)
    const result = await analyzeRepository(octokit, owner, repo, process.env.GROQ_API_KEY)

    res.json(result)
  } catch (err) {
    console.error('Error during analysis:', err.message)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`)
  console.log(`📋 API: POST http://localhost:${PORT}/api/explain`)
  console.log(`❤️  Health: GET http://localhost:${PORT}/health`)
})
