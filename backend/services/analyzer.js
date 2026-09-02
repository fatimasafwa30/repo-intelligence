// backend/services/analyzer.js
import axios from 'axios'
import { scanRepository } from './scanner.js'
import { fetchKeyFiles, fetchFileContent } from './fileFetcher.js'
import {
  buildTechnologyEvidence,
  buildFileEvidence,
  buildRelationshipEvidence,
  buildDocumentationAudit,
  buildHealthAndDriftReport
} from './evidenceEngine.js'
import { getFallbackModels } from './models.js'

/**
 * Calls Groq API with automatic model fallbacks to generate analysis.
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseRetryAfterMs(error) {
  const msg = error?.response?.data?.error?.message || ''
  const match = msg.match(/try again in ([0-9.]+)s/)
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500
  const header = error?.response?.headers?.['retry-after']
  if (header) return parseInt(header) * 1000 + 500
  return null
}

async function callGroqWithFallback(prompt, apiKey) {
  const models = getFallbackModels()

  let lastError = null

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert codebase intelligence engine. You analyze actual source code and file trees to provide accurate, evidence-backed architectural analysis in valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 1500
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
        if (content.startsWith('```json')) {
          content = content.replace(/^```json\n?/, '').replace(/```$/, '').trim()
        } else if (content.startsWith('```')) {
          content = content.replace(/^```\n?/, '').replace(/```$/, '').trim()
        }
        // Extract JSON object if surrounded by text
        if (!content.startsWith('{') && !content.startsWith('[')) {
          const jsonStart = content.indexOf('{')
          const jsonEnd = content.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            content = content.substring(jsonStart, jsonEnd + 1)
          }
        }
        const parsed = JSON.parse(content)

        // Clean diagram
        let cleanDiagram = parsed.diagram || ''
        cleanDiagram = cleanDiagram.replace(/```(?:mermaid)?\n?/gi, '').replace(/```/g, '').trim()

        // Clean components
        let cleanComponents = parsed.components
        if (Array.isArray(cleanComponents)) {
          cleanComponents = cleanComponents.map(c => typeof c === 'string' ? (c.startsWith('-') ? c : `- ${c}`) : `- ${JSON.stringify(c)}`).join('\n')
        }

        return {
          architecture: parsed.architecture || '',
          components: cleanComponents || '',
          diagram: cleanDiagram,
          setupGuide: parsed.setupGuide || ''
        }
      } catch (err) {
        const errMsg = err?.response?.data?.error?.message || err.message || ''
        const isRateLimit = err?.response?.status === 429 || errMsg.includes('Rate limit') || errMsg.includes('rate_limit')
        const isOverloaded = errMsg.includes('overloaded')
        const isDecommissioned = errMsg.includes('decommissioned') || errMsg.includes('does not exist')
        const isJsonError = err.message?.includes('JSON') || err.message === 'Unexpected end of JSON input'

        if (isDecommissioned) {
          console.warn(`Model ${model} unavailable (decommissioned/no access), trying next`)
          lastError = err
          break
        }

        if (isRateLimit && attempt === 0) {
          const waitMs = parseRetryAfterMs(err)
          if (waitMs && waitMs <= 3000) {
            console.log(`Rate limit on ${model}, short wait ${waitMs}ms then retrying...`)
            await sleep(waitMs)
            continue
          }
          console.warn(`Model ${model} rate limited (${waitMs || 'unknown'}ms wait), switching immediately to next fallback model`)
          lastError = err
          break
        }

        if ((isOverloaded || isJsonError) && attempt === 0) {
          console.log(`Model ${model} transient error (${isOverloaded ? 'overloaded' : 'json'}), waiting 3s...`)
          await sleep(3000)
          continue
        }

        console.warn(`Model ${model} attempt ${attempt + 1} failed:`, errMsg)
        lastError = err
        break
      }
    }
  }

  const detail = lastError?.response?.data?.error?.message || lastError?.message || 'Unknown error'
  throw new Error(`AI analysis failed: ${detail}`)
}

/**
 * Stage 4: Smart Documentation Audit Engine (Dynamic Claim Extraction)
 * Uses Groq to parse the README into a structured JSON list of claimed technologies.
 */
async function extractReadmeClaims(readmeContent, apiKey) {
  if (!readmeContent || readmeContent === 'No README found' || readmeContent.length < 50) {
    return []
  }

  const prompt = `Analyze this project README and extract the major technical claims made.
Return a valid JSON object with a single key "claims" containing an array of objects. Each object must have these exact keys:
- "claim": A short sentence summarizing the claim (e.g. "Uses React for the frontend").
- "category": The technology category (e.g. "Frontend", "Backend", "Database", "AI", "Deployment").
- "subject": The specific technology name (e.g. "React", "Supabase", "Express").

README CONTENT:
${readmeContent.substring(0, 5000)}

IMPORTANT:
Respond ONLY with the raw JSON array. Do not include markdown fences, explanations, or backticks.`

  try {
    const models = getFallbackModels()

    let lastError = null
    for (const model of models) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 1500
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000
          }
        )

        let content = response.data.choices[0].message.content.trim()
        
        // Some models ignore json_object and return array directly, some wrap in object
        if (content.startsWith('{') && content.includes('"claims"')) {
          const parsed = JSON.parse(content)
          return parsed.claims || []
        }
        
        if (!content.startsWith('[')) {
          // Attempt to extract JSON array
          const start = content.indexOf('[')
          const end = content.lastIndexOf(']')
          if (start >= 0 && end >= 0) {
            content = content.substring(start, end + 1)
          }
        }
        
        return JSON.parse(content)
      } catch (err) {
        lastError = err
      }
    }
    console.warn('Could not dynamically extract claims:', lastError?.message)
    return []
  } catch (err) {
    console.warn('Failed to parse dynamic claims:', err.message)
    return []
  }
}

/**
 * In-memory cache for repository data to reuse between /explain and /ask
 * Key: "owner/repo"
 */
export const repositoryCache = new Map()

/**
 * Performs full evidence-based repository analysis.
 */
export async function analyzeRepository(octokit, owner, repo, groqApiKey) {
  // 1. Scan full repository tree and classify files
  console.log(`[1/5] Scanning file tree for ${owner}/${repo}...`)
  const scanResult = await scanRepository(octokit, owner, repo)
  const allTreePaths = scanResult.tree.map(t => t.path)

  // 2. Fetch README (if available)
  console.log(`[2/5] Fetching README and key manifests...`)
  let readme = 'No README found'
  try {
    const readmeRes = await octokit.repos.getReadme({ owner, repo })
    readme = Buffer.from(readmeRes.data.content, 'base64').toString('utf-8')
  } catch {
    // README not present
  }

  // 3. Fetch package.json if present for dependency detection
  let packageJson = {}
  try {
    const pkgRaw = await fetchFileContent(octokit, owner, repo, 'package.json')
    if (pkgRaw) {
      packageJson = JSON.parse(pkgRaw)
    }
  } catch {
    // Non-JSON or not found
  }

  // 4. Fetch contents of high-priority source/config files safely
  console.log(`[3/5] Safely fetching key source files...`)
  const keyFiles = await fetchKeyFiles(octokit, owner, repo, scanResult.classifiedFiles, allTreePaths)

  // 5. Build verified evidence layer
  console.log(`[4/5] Computing evidence for technologies, files, and relationships...`)
  const techEvidence = buildTechnologyEvidence(allTreePaths, packageJson, keyFiles)
  const fileEvidence = buildFileEvidence(keyFiles)
  const relationshipEvidence = buildRelationshipEvidence(keyFiles, allTreePaths)
  
  console.log(`[4.5/5] Extracting dynamic README claims and running documentation audit...`)
  const dynamicClaims = await extractReadmeClaims(readme, groqApiKey)
  const documentationAudit = buildDocumentationAudit(readme, techEvidence, allTreePaths, keyFiles, packageJson, dynamicClaims)
  const healthReport = buildHealthAndDriftReport(scanResult, techEvidence, documentationAudit, keyFiles, readme)

  const verifiedTechNames = techEvidence.map(t => t.name)

  // 6. Build structured context prompt for Groq with grounded evidence
  console.log(`[5/5] Generating AI intelligence grounded in code evidence...`)
  const fileSummary = [
    scanResult.classifiedFiles.entryPoints.length > 0 ? `Entry Points:\n${scanResult.classifiedFiles.entryPoints.map(p => `  - ${p}`).join('\n')}` : '',
    scanResult.classifiedFiles.routes.length > 0 ? `API Routes / Endpoints:\n${scanResult.classifiedFiles.routes.map(p => `  - ${p}`).join('\n')}` : '',
    scanResult.classifiedFiles.controllers.length > 0 ? `Controllers:\n${scanResult.classifiedFiles.controllers.map(p => `  - ${p}`).join('\n')}` : '',
    scanResult.classifiedFiles.models.length > 0 ? `Models / Schemas:\n${scanResult.classifiedFiles.models.map(p => `  - ${p}`).join('\n')}` : '',
    scanResult.classifiedFiles.components.length > 0 ? `UI Components:\n${scanResult.classifiedFiles.components.slice(0, 10).map(p => `  - ${p}`).join('\n')}` : '',
    scanResult.classifiedFiles.configs.length > 0 ? `Configurations:\n${scanResult.classifiedFiles.configs.map(p => `  - ${p}`).join('\n')}` : ''
  ].filter(Boolean).join('\n\n')

  let codeSnippets = keyFiles.map(f => `--- FILE: ${f.path} ---\n${f.content.slice(0, 500)}`).join('\n\n')
  if (codeSnippets.length > 4000) codeSnippets = codeSnippets.slice(0, 4000) + '\n...(TRUNCATED)'
  const verifiedTechList = verifiedTechNames.length > 0 ? verifiedTechNames.join(', ') : 'None explicitly detected'

  const prompt = `Analyze this GitHub repository based EXCLUSIVELY on the code evidence below:
Repository: ${owner}/${repo}
Primary Language: ${scanResult.repository.language || 'Unknown'}
VERIFIED CODE EVIDENCE TECHNOLOGIES: ${verifiedTechList}

CLASSIFIED REPOSITORY STRUCTURE:
${fileSummary}

ACTUAL SOURCE CODE SNIPPETS:
${codeSnippets || 'No direct source snippets fetched'}

README EXCERPT:
${readme.slice(0, 2000)}

IMPORTANT RULES:
- ONLY reference technologies and components that exist in the evidence above.
- Do NOT invent unverified frameworks (e.g. do not mention Express/MongoDB if this is a frontend-only app).

Respond with a valid JSON object matching exactly this structure (no markdown fences, just the raw JSON object):
{
  "architecture": "Concise explanation (150 words) of how this codebase works, its client/server/database architecture, and control flow based on the files above.",
  "components": "- filename: description\\n- filename: description",
  "diagram": "graph TD\\n    A[Client] --> B[Route]\\n    B --> C[Controller]",
  "setupGuide": "Clear step-by-step setup instructions based on configs/scripts detected."
}`

  const aiResult = await callGroqWithFallback(prompt, groqApiKey)

  const finalResult = {
    projectName: repo,
    url: `https://github.com/${owner}/${repo}`,
    repository: scanResult.repository,
    stats: scanResult.stats,
    detectedTechnologies: verifiedTechNames,
    evidence: {
      technologies: techEvidence,
      files: fileEvidence,
      relationships: relationshipEvidence,
      documentationAudit,
      healthReport
    },
    healthReport,
    classifiedFiles: scanResult.classifiedFiles,
    importantFiles: fileEvidence,
    description: aiResult.architecture,
    components: aiResult.components,
    diagram: aiResult.diagram,
    setupGuide: aiResult.setupGuide,
    techStack: verifiedTechNames,
    generatedAt: new Date().toISOString()
  }

  // Cache the full internal state for Forensic Interrogator
  repositoryCache.set(`${owner}/${repo}`, {
    scanResult,
    allTreePaths,
    keyFiles,
    techEvidence,
    packageJson,
    readme
  })

  return finalResult
}
