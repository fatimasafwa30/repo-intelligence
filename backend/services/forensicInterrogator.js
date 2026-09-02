import axios from 'axios'
import { repositoryCache, analyzeRepository } from './analyzer.js'
import { fetchFileContent } from './fileFetcher.js'
import { getFallbackModels } from './models.js'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseRetryAfterMs(error) {
  // Groq rate limit errors say "Please try again in X.XXXs"
  const msg = error?.response?.data?.error?.message || ''
  const match = msg.match(/try again in ([0-9.]+)s/)
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500 // add 500ms buffer
  // Also check for Retry-After header
  const header = error?.response?.headers?.['retry-after']
  if (header) return parseInt(header) * 1000 + 500
  return null
}

async function callGroqOnce(model, prompt, apiKey) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  )

  let content = response.data.choices[0].message.content.trim()
  
  // Strip <think>...</think> blocks from reasoning models (e.g. Qwen)
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  
  // Clean markdown JSON wrapping if present
  if (content.startsWith('```json')) {
    content = content.replace(/^```json\n?/, '').replace(/```$/, '').trim()
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\n?/, '').replace(/```$/, '').trim()
  }

  // If still not starting with {, try to extract the first JSON object
  if (!content.startsWith('{') && !content.startsWith('[')) {
    const jsonStart = content.indexOf('{')
    const jsonEnd = content.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      content = content.substring(jsonStart, jsonEnd + 1)
    }
  }

  return JSON.parse(content)
}

async function callGroqJson(prompt, apiKey) {
  const models = getFallbackModels()

  let lastError = null
  for (const model of models) {
    // Try each model up to 2 times (once immediately, once after waiting for rate limit)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await callGroqOnce(model, prompt, apiKey)
        return result
      } catch (err) {
        const errMsg = err?.response?.data?.error?.message || err.message || ''
        const isRateLimit = err?.response?.status === 429 || errMsg.includes('Rate limit') || errMsg.includes('rate_limit')
        const isOverloaded = errMsg.includes('overloaded')
        const isDecommissioned = errMsg.includes('decommissioned') || errMsg.includes('does not exist')
        const isJsonError = err.message === 'Unexpected end of JSON input' || err.message?.includes('JSON')

        if (isDecommissioned) {
          console.warn(`[Forensic] Model ${model} unavailable (decommissioned/no access), trying next model`)
          lastError = err
          break // skip retrying this model
        }

        if (isRateLimit && attempt === 0) {
          const waitMs = parseRetryAfterMs(err)
          if (waitMs && waitMs <= 3000) {
            console.log(`[Forensic] Rate limit on ${model}, short wait ${waitMs}ms then retrying...`)
            await sleep(waitMs)
            continue
          }
          console.warn(`[Forensic] Model ${model} rate limited (${waitMs || 'unknown'}ms wait), switching immediately to next fallback model`)
          lastError = err
          break
        }

        if ((isOverloaded || isJsonError) && attempt === 0) {
          console.log(`[Forensic] Model ${model} transient error (${isOverloaded ? 'overloaded' : 'json'}), waiting 1s then retrying...`)
          await sleep(1000)
          continue
        }

        console.warn(`[Forensic] Model ${model} failed (attempt ${attempt + 1}):`, errMsg)
        lastError = err
        break // move to next model
      }
    }
  }
  throw new Error(`AI interrogation failed: ${lastError?.response?.data?.error?.message || lastError?.message}`)
}

export async function askRepository(octokit, owner, repo, question, groqApiKey) {
  const cacheKey = `${owner}/${repo}`
  let repoData = repositoryCache.get(cacheKey)
  
  if (!repoData) {
    console.log(`Cache miss for ${cacheKey}, running analysis first...`)
    await analyzeRepository(octokit, owner, repo, groqApiKey)
    repoData = repositoryCache.get(cacheKey)
    if (!repoData) throw new Error('Failed to analyze repository for interrogation.')
  }

  const { allTreePaths, keyFiles } = repoData

  // STEP A & B: Question Understanding & Targeted Evidence Search
  console.log(`[Forensic] Searching tree for question: "${question}"`)

  // Pre-filter candidate paths to prevent prompt bloat and keep latency under 2 seconds
  let candidateTree = allTreePaths
  if (allTreePaths.length > 35) {
    const questionTerms = question
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['how', 'does', 'work', 'what', 'where', 'when', 'the', 'and', 'for', 'with', 'this', 'that'].includes(w))

    const scored = allTreePaths.map(p => {
      const lower = p.toLowerCase()
      let score = 0
      for (const term of questionTerms) {
        if (lower.includes(term)) score += 8
      }
      if (/(?:routes?|controllers?|models?|services?|middleware|auth|guards?|components?|api|handlers?)\//i.test(lower)) {
        score += 3
      }
      if (/\.(js|ts|jsx|tsx|py|go|java|rs|rb|php)$/i.test(lower)) {
        score += 1
      }
      if (/(package\.json|\.env|dockerfile|schema\.)/i.test(lower)) {
        score += 2
      }
      if (/(package-lock|\.lock|yarn\.lock|\.svg|\.png|\.jpg|\.css|\.map)$/i.test(lower)) {
        score -= 5
      }
      return { path: p, score }
    })

    scored.sort((a, b) => b.score - a.score)
    candidateTree = scored.slice(0, 35).map(s => s.path)
  }

  const searchPrompt = `You are a forensic codebase interrogator.
The user is asking: "${question}"

Here are the most relevant repository files:
${candidateTree.join('\n')}

Identify up to 5 files that are MOST likely to contain the answer. 
Return a JSON object with a single key "files" containing an array of exact file paths from the list above.
Example: { "files": ["src/App.jsx", "backend/routes/auth.js"] }`

  let searchResult = { files: [] }
  try {
    searchResult = await callGroqJson(searchPrompt, groqApiKey)
  } catch (e) {
    console.warn('[Forensic] Evidence search failed, falling back to top scored candidates', e.message)
    searchResult = { files: candidateTree.slice(0, 5) }
  }
  
  const candidatePaths = searchResult.files || []

  // STEP C: Actual File Fetch
  const fetchedEvidence = []
  const filesToFetch = []
  
  // Deduplicate and filter candidates that are actually in the tree
  const validCandidates = candidatePaths.filter(p => allTreePaths.includes(p))

  for (const path of validCandidates) {
    // Check if we already have it in keyFiles
    const existing = keyFiles.find(kf => kf.path === path)
    if (existing) {
      fetchedEvidence.push({ path, content: existing.content })
    } else {
      filesToFetch.push(path)
    }
  }

  // Always include package manifests in evidence if relevant to the question
  if (question.toLowerCase().match(/(database|technology|use|redis|mongo|postgres|express|react|vue|angular)/)) {
    keyFiles.filter(kf => kf.path.endsWith('package.json')).forEach(kf => {
      if (!fetchedEvidence.find(f => f.path === kf.path)) {
        fetchedEvidence.push({ path, content: kf.content })
      }
    })
  }

  // Fetch missing files concurrently in parallel (up to 5)
  const targetsToFetch = filesToFetch.slice(0, 5)
  if (targetsToFetch.length > 0) {
    console.log(`[Forensic] Fetching ${targetsToFetch.length} dynamic evidence files in parallel...`)
    const results = await Promise.allSettled(
      targetsToFetch.map(async (path) => {
        const content = await fetchFileContent(octokit, owner, repo, path)
        return { path, content }
      })
    )
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.content) {
        fetchedEvidence.push(res.value)
      }
    }
  }

  // STEP D & E: Deterministic Evidence Extraction & Final Answer
  let evidenceContext = ''
  fetchedEvidence.forEach(f => {
    // Aggressively truncate to prevent exceeding Groq 8000 TPM limit
    const lines = f.content.split('\n')
    const truncated = lines.length > 150 ? lines.slice(0, 150).join('\n') + '\n... (truncated for rate limit)' : f.content
    evidenceContext += `\n--- FILE: ${f.path} ---\n${truncated}\n`
  })
  
  // Hard cap to roughly 2000 tokens (approx 8000 chars)
  if (evidenceContext.length > 8000) {
    evidenceContext = evidenceContext.substring(0, 8000) + '\n... (REMAINING EVIDENCE TRUNCATED TO PREVENT RATE LIMITS)'
  }
  
  if (fetchedEvidence.length === 0) {
    evidenceContext = 'No files fetched.'
  }

  console.log(`[Forensic] Answering question using ${fetchedEvidence.length} fetched files...`)
  const finalPrompt = `You are explaining a software repository using ONLY the supplied evidence.
Do not use outside knowledge to claim repository facts. Do not invent files. Do not invent functions. Do not invent line numbers.
Do not assume a technology is present because the README says it exists. Do not assume a database is present just because a file is named models/ or database/.

USER QUESTION: "${question}"

FETCHED EVIDENCE:
${evidenceContext}

IMPORTANT: 
Your PRIMARY GOAL is to answer the user's question using the provided evidence. Even partial answers, hints, or related code found in the evidence MUST be explained in detail to help the user.
ONLY if the evidence is completely unrelated and contains absolutely zero information about the question, return EXACTLY:
"NOT FOUND IN SCANNED EVIDENCE" as the answer.

Respond with structured JSON matching exactly this schema:
{
  "answer": "Your detailed explanation here, OR 'NOT FOUND IN SCANNED EVIDENCE' if no evidence supports it.",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "citations": [
    {
      "file": "exact/path/from/evidence",
      "lineRange": "1-10",
      "proof": "Short explanation of what this proves"
    }
  ],
  "confidenceChecklist": [
    { "label": "Relevant source file fetched", "found": true },
    { "label": "Implementation details verified", "found": true }
  ]
}`

  let finalJson
  try {
    finalJson = await callGroqJson(finalPrompt, groqApiKey)
  } catch (e) {
    console.warn('[Forensic] Final answer generation failed:', e.message)
    throw new Error(`AI interrogation failed: ${e.message}`)
  }
  
  let validCitations = []
  if (Array.isArray(finalJson.citations)) {
    validCitations = finalJson.citations.filter(cit => {
      // Must exist in fetchedEvidence
      const fetched = fetchedEvidence.find(f => f.path.includes(cit.file) || cit.file.includes(f.path))
      if (!fetched) {
        console.log(`[Forensic Debug] Citation discarded: ${cit.file} not found in fetched evidence`)
        return false
      }
      
      // Basic line number existence check
      try {
        if (cit.lineRange) {
          const startLine = parseInt(cit.lineRange.toString().split(/[-:]/)[0])
          const lines = fetched.content.split('\n')
          if (startLine > lines.length) {
             console.log(`[Forensic Debug] Citation discarded: line ${startLine} out of bounds`)
             return false
          }
        }
      } catch (e) {}
      
      return true
    })
  }
  
  if (validCitations.length === 0 && finalJson.answer !== 'NOT FOUND IN SCANNED EVIDENCE') {
    console.log("[Forensic Debug] Answer provided, but valid citations were empty. Retaining answer.")
    // We no longer overwrite the answer here! The LLM's answer is preserved.
  }

  const finalStatus = finalJson.answer === 'NOT FOUND IN SCANNED EVIDENCE' ? 'NOT_FOUND' : 'ANSWERED'

  console.log(`\n=== FORENSIC PIPELINE DEBUG ===`)
  console.log(`QUESTION: ${question}`)
  console.log(`CANDIDATE FILES: ${JSON.stringify(candidatePaths)}`)
  console.log(`FETCHED FILES: ${fetchedEvidence.map(f => f.path).join(', ')}`)
  console.log(`EVIDENCE CONTENT PROVIDED TO FINAL LLM: ${fetchedEvidence.length} files, ${evidenceContext.length} chars`)
  console.log(`RAW LLM RESPONSE: ${JSON.stringify({ answer: finalJson.answer, citations: finalJson.citations })}`)
  console.log(`VALIDATED RESPONSE: ${validCitations.length} valid citations`)
  console.log(`FINAL RESPONSE STATUS: ${finalStatus}`)
  console.log(`===============================\n`)

  return {
    question,
    status: finalJson.answer === 'NOT FOUND IN SCANNED EVIDENCE' ? 'NOT_FOUND' : 'ANSWERED',
    answer: finalJson.answer,
    confidence: finalJson.confidence,
    evidenceSearch: candidatePaths,
    verifiedFiles: fetchedEvidence.map(f => {
      return { file: f.path, lineRange: `1-${f.content.split('\n').length}` }
    }),
    citations: validCitations,
    confidenceChecklist: finalJson.confidenceChecklist || []
  }
}
