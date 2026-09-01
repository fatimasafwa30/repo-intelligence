// backend/services/fileFetcher.js

/**
 * Safely fetches a single file's text content from GitHub.
 * Returns null if the file cannot be retrieved or is too large.
 */
export async function fetchFileContent(octokit, owner, repo, path, maxChars = 3500) {
  try {
    const res = await octokit.repos.getContent({
      owner,
      repo,
      path
    })

    if (!res.data || !res.data.content) {
      return null
    }

    const decoded = Buffer.from(res.data.content, 'base64').toString('utf-8')
    return decoded.length > maxChars ? decoded.substring(0, maxChars) + '\n... [TRUNCATED]' : decoded
  } catch {
    return null
  }
}

/**
 * Prioritizes and safely fetches key files from the scanned repository.
 */
export async function fetchKeyFiles(octokit, owner, repo, classifiedFiles, allTreePaths = []) {
  const priorityPaths = []

  // 1. Configs / manifests (e.g. package.json, requirements.txt, pom.xml, go.mod)
  const topConfigs = (classifiedFiles.configs || []).filter(p => /package\.json$|\.env\.example$|render\.yaml$|vercel\.json$|dockerfile|requirements\.txt$|pyproject\.toml$|pom\.xml$|build\.gradle$|go\.mod$|composer\.json$|gemfile$/i.test(p)).slice(0, 4)
  priorityPaths.push(...topConfigs)

  // 2. Database schemas / migrations / configs if any
  const schemas = allTreePaths.filter(p => /schema\.(prisma|sql|gql)$|\.sql$|database\.(js|ts|py|go)|db\.(js|ts|py|go)/i.test(p)).slice(0, 2)
  priorityPaths.push(...schemas)

  // 3. Entry points (server.js, src/main.jsx, src/index.js, app.py, main.go)
  const topEntryPoints = (classifiedFiles.entryPoints || []).slice(0, 2)
  priorityPaths.push(...topEntryPoints)

  // 4. Main App / Router component
  const appFile = allTreePaths.find(p => /(?:^|\/)(App|main|application)\.(jsx|tsx|js|vue|py|go|java)$/i.test(p))
  if (appFile && !priorityPaths.includes(appFile)) priorityPaths.push(appFile)

  // 5. Context / State / Lib / Clients (e.g. supabase.js, api/client.js, context/...)
  const libOrContext = allTreePaths.filter(p => /(?:context|lib|services|api\/client|core)\/[^/]+\.(js|jsx|ts|tsx|py|go|java)$/i.test(p)).slice(0, 2)
  priorityPaths.push(...libOrContext)

  // 6. Key routes / controllers / models
  const topRoutes = (classifiedFiles.routes || []).slice(0, 2)
  priorityPaths.push(...topRoutes)
  const topControllers = (classifiedFiles.controllers || []).slice(0, 2)
  priorityPaths.push(...topControllers)
  const topModels = (classifiedFiles.models || []).slice(0, 2)
  priorityPaths.push(...topModels)

  // 7. Key specialized feature components (e.g. AI / scanner / auth)
  const featureComponents = allTreePaths.filter(p => /(?:AI|Auth|Scanner|Emergency|Report|Admin|Dashboard|Security)[^/]*\.(jsx|tsx|vue|py|go|java)$/i.test(p)).slice(0, 2)
  priorityPaths.push(...featureComponents)

  // Deduplicate and cap at 15 files maximum to allow more cross-language context
  const uniquePaths = Array.from(new Set(priorityPaths)).slice(0, 15)

  // Fetch concurrently with Promise.allSettled
  const results = await Promise.allSettled(
    uniquePaths.map(async (filePath) => {
      const content = await fetchFileContent(octokit, owner, repo, filePath)
      return {
        path: filePath,
        content: content || 'Could not fetch content'
      }
    })
  )

  return results
    .filter(r => r.status === 'fulfilled' && r.value.content !== 'Could not fetch content')
    .map(r => r.value)
}
