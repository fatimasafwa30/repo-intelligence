// backend/services/scanner.js

// File extension blacklist (binaries, media, fonts, locks, etc.)
const IGNORED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'mp4', 'webm', 'mp3', 'wav',
  'pdf', 'zip', 'tar', 'gz', '7z', 'rar', 'exe', 'dll', 'so', 'dylib', 'bin',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'map', 'lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'gemfile.lock',
  'class', 'jar', 'war', 'pyc', 'pyo'
])

// Directory blacklist (vendor, build artifacts, caches, git metadata)
const IGNORED_DIRECTORIES = new Set([
  'node_modules', '.git', '.github', '.next', '.nuxt', 'dist', 'build', 'out',
  '.cache', '__pycache__', '.pytest_cache', 'coverage', '.idea', '.vscode',
  'vendor', 'target', 'bin', 'obj', '.turbo', '.angular', 'venv', 'env'
])



/**
 * Checks if a given file path should be ignored.
 */
function shouldIgnorePath(path) {
  const parts = path.split('/')
  
  // Check directory blacklist
  for (const part of parts.slice(0, -1)) {
    if (IGNORED_DIRECTORIES.has(part.toLowerCase())) {
      return true
    }
  }

  // Check file extension / filename blacklist
  const filename = parts[parts.length - 1].toLowerCase()
  if (IGNORED_DIRECTORIES.has(filename)) return true
  
  const ext = filename.split('.').pop()
  if (IGNORED_EXTENSIONS.has(ext) || IGNORED_EXTENSIONS.has(filename)) {
    return true
  }

  return false
}

/**
 * Classifies a file into functional categories.
 */
function classifyFile(path) {
  const lower = path.toLowerCase()
  const categories = []

  // Manifests & Configurations
  if (/package\.json$|tsconfig\.json$|vite\.config|\.env\.example$|dockerfile|docker-compose|render\.yaml|vercel\.json|requirements\.txt$|pyproject\.toml$|cargo\.toml$|gemfile$|pom\.xml$|build\.gradle$|go\.mod$|composer\.json$/i.test(lower)) {
    categories.push('config')
  }

  // Entry points (main application files)
  if (/(?:^|\/)(server|app|index|main|application)\.(js|jsx|ts|tsx|py|go|rs|java|rb|php)$/i.test(lower)) {
    categories.push('entrypoint')
  }

  // Routes / Endpoints
  if (/(?:routes?|endpoints?|api|urls?)\/|\.(routes?|urls?)\.(js|ts|py|go|java|rb|php)$/i.test(lower)) {
    categories.push('routes')
  }

  // Controllers / Handlers
  if (/(?:controllers?|handlers?|views?)\/|\.(controllers?|handlers?|views?)\.(js|ts|py|go|java|rb|php)$/i.test(lower)) {
    // Note: 'views' in Python/Django are often controllers
    categories.push('controllers')
  }

  // Models / Entities / Schemas
  if (/(?:models?|schemas?|entities)\/|\.(models?|entities?)\.(js|ts|py|go|java|rb|php)$|schema\.(prisma|sql|gql)$/i.test(lower)) {
    categories.push('models')
  }

  // Services / Logic / Utilities
  if (/(?:services?|lib|utils|helpers|core)\//i.test(lower)) {
    categories.push('services')
  }

  // UI Components
  if (/(?:components?|views?|pages?|templates?)\/|\.(jsx|tsx|vue|svelte|html|njk|ejs|pug)$/i.test(lower)) {
    // Only flag 'views/' as components if they are UI related, but we leave it broad here
    categories.push('components')
  }

  // Tests
  if (/(?:tests?|__tests?__|spec)\/|\.(test|spec)\.(js|ts|jsx|tsx|py|go|java|rb|php)$/i.test(lower)) {
    categories.push('tests')
  }

  return categories
}


/**
 * Scans a repository using the GitHub Git Trees API.
 */
export async function scanRepository(octokit, owner, repo) {
  try {
    // 1. Get repository metadata
    const repoInfo = await octokit.repos.get({ owner, repo })
    const defaultBranch = repoInfo.data.default_branch || 'main'

    // 2. Fetch full repository tree recursively in 1 single API call
    let treeItems = []
    try {
      const treeRes = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: 'true'
      })
      treeItems = treeRes.data.tree || []
    } catch {
      // Fallback to root contents if git tree fails
      const contentsRes = await octokit.repos.getContent({ owner, repo, path: '' })
      if (Array.isArray(contentsRes.data)) {
        treeItems = contentsRes.data.map(item => ({
          path: item.name,
          type: item.type === 'dir' ? 'tree' : 'blob',
          size: item.size || 0
        }))
      }
    }

    // 3. Filter tree items with limits
    const filteredFiles = []
    const classifiedFiles = {
      configs: [],
      entryPoints: [],
      routes: [],
      controllers: [],
      models: [],
      services: [],
      components: [],
      tests: [],
      other: []
    }

    let fileCount = 0
    let dirCount = 0

    for (const item of treeItems) {
      if (item.type === 'tree') {
        dirCount++
        continue
      }

      fileCount++

      if (shouldIgnorePath(item.path)) {
        continue
      }

      const categories = classifyFile(item.path)
      const fileEntry = {
        path: item.path,
        size: item.size || 0,
        categories
      }

      filteredFiles.push(fileEntry)

      // Bucket by category
      if (categories.includes('config')) classifiedFiles.configs.push(item.path)
      if (categories.includes('entrypoint')) classifiedFiles.entryPoints.push(item.path)
      if (categories.includes('routes')) classifiedFiles.routes.push(item.path)
      if (categories.includes('controllers')) classifiedFiles.controllers.push(item.path)
      if (categories.includes('models')) classifiedFiles.models.push(item.path)
      if (categories.includes('services')) classifiedFiles.services.push(item.path)
      if (categories.includes('components')) classifiedFiles.components.push(item.path)
      if (categories.includes('tests')) classifiedFiles.tests.push(item.path)
      if (categories.length === 0) classifiedFiles.other.push(item.path)

      // Sensible limit: keep up to 400 relevant files in memory
      if (filteredFiles.length >= 400) break
    }

    return {
      repository: {
        name: repoInfo.data.name,
        fullName: repoInfo.data.full_name,
        description: repoInfo.data.description || 'No description provided.',
        defaultBranch,
        language: repoInfo.data.language,
        stars: repoInfo.data.stargazers_count,
        forks: repoInfo.data.forks_count,
        isPrivate: repoInfo.data.private
      },
      stats: {
        totalScannedFiles: fileCount,
        totalScannedDirectories: dirCount,
        filteredRelevantFiles: filteredFiles.length
      },
      tree: filteredFiles,
      classifiedFiles
    }
  } catch (err) {
    throw new Error(`Repository scanner failed: ${err.message}`)
  }
}
