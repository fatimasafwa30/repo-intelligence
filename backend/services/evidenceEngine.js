// backend/services/evidenceEngine.js
import path from 'path'

/**
 * Known Technology Catalog with explicit evidence verification rules.
 */
const TECHNOLOGY_CATALOG = [
  // --- FRONTEND FRAMEWORKS & LIBRARIES ---
  {
    name: 'React',
    category: 'frontend',
    packages: ['react', 'react-dom'],
    imports: [/from ['"]react['"]/i, /require\(['"]react['"]\)/i, /from ['"]react-dom['"]/i],
    filePatterns: [],
    codePatterns: [/createRoot\(/, /ReactDOM\.createRoot/, /React\.createElement/, /useState\(/, /useEffect\(/],
    reason: 'React UI library declared in dependencies and used for component rendering'
  },
  {
    name: 'React Router',
    category: 'frontend',
    packages: ['react-router-dom', 'react-router', '@remix-run/router'],
    imports: [/from ['"]react-router-dom['"]/i, /from ['"]react-router['"]/i],
    filePatterns: [],
    codePatterns: [/<BrowserRouter/, /<Routes>/, /createBrowserRouter\(/],
    reason: 'Client-side routing library managing application navigation and views'
  },
  {
    name: 'Vite',
    category: 'tools',
    packages: ['vite', '@vitejs/plugin-react', '@vitejs/plugin-vue'],
    imports: [],
    filePatterns: [/vite\.config\.(js|ts|mjs|cjs)$/i],
    codePatterns: [/defineConfig\(/],
    reason: 'Next-generation frontend tooling and development build server'
  },
  {
    name: 'Tailwind CSS',
    category: 'styling',
    packages: ['tailwindcss', 'postcss', 'autoprefixer'],
    imports: [],
    filePatterns: [/tailwind\.config\.(js|cjs|ts)$/i, /postcss\.config\.(js|cjs|mjs)$/i],
    codePatterns: [/@tailwind base/, /@tailwind components/, /@tailwind utilities/],
    reason: 'Utility-first CSS framework configured for styling application components'
  },
  {
    name: 'Framer Motion',
    category: 'frontend',
    packages: ['framer-motion', 'motion'],
    imports: [/from ['"]framer-motion['"]/i, /from ['"]motion\/react['"]/i],
    filePatterns: [],
    codePatterns: [/motion\.\w+/, /AnimatePresence/],
    reason: 'Animation library powering smooth UI transitions and micro-interactions'
  },
  {
    name: 'Next.js',
    category: 'frontend',
    packages: ['next'],
    imports: [/from ['"]next/i, /require\(['"]next/i],
    filePatterns: [/next\.config\.(js|mjs)$/i],
    codePatterns: [/next\/router/, /next\/image/, /next\/link/],
    reason: 'React framework providing server-side rendering and static site generation'
  },
  {
    name: 'Vue.js',
    category: 'frontend',
    packages: ['vue', 'vue-router', 'pinia'],
    imports: [/from ['"]vue['"]/i, /require\(['"]vue['"]\)/i],
    filePatterns: [/\.vue$/i],
    codePatterns: [/createApp\(/, /defineComponent\(/, /ref\(/, /reactive\(/],
    reason: 'Vue.js progressive JavaScript framework for building user interfaces'
  },

  // --- AI & EXTERNAL SERVICES ---
  {
    name: 'Google Gemini AI',
    category: 'ai',
    packages: ['@google/generative-ai', '@google/genai', 'google-generativeai'],
    imports: [/from ['"]@google\/generative-ai['"]/i, /require\(['"]@google\/generative-ai['"]\)/i, /import google\.generativeai/i, /from google import generativeai/i],
    filePatterns: [],
    codePatterns: [/GoogleGenerativeAI/, /getGenerativeModel/, /genai\.GenerativeModel/],
    reason: 'Google Gemini multimodal AI SDK for vision analysis and reasoning'
  },
  {
    name: 'OpenAI API',
    category: 'ai',
    packages: ['openai'],
    imports: [/from ['"]openai['"]/i, /require\(['"]openai['"]\)/i, /import openai/i],
    filePatterns: [],
    codePatterns: [/new OpenAI\(/, /chat\.completions\.create/, /openai\.ChatCompletion/],
    reason: 'OpenAI SDK integrated for language models and completions'
  },
  {
    name: 'Supabase',
    category: 'database',
    packages: ['@supabase/supabase-js', '@supabase/ssr', 'supabase-py', 'supabase'],
    imports: [/from ['"]@supabase\/supabase-js['"]/i, /require\(['"]@supabase\/supabase-js['"]\)/i, /from supabase import/i],
    filePatterns: [/supabase_schema\.sql$/i, /lib\/supabase\.(js|ts)$/i],
    codePatterns: [/createClient\(/, /supabase\.from\(/, /supabase\.auth/],
    reason: 'Supabase backend-as-a-service providing PostgreSQL database and authentication'
  },

  // --- BACKEND FRAMEWORKS & UTILITIES ---
  {
    name: 'Express',
    category: 'backend',
    packages: ['express'],
    imports: [/from ['"]express['"]/i, /require\(['"]express['"]\)/i, /from ['"]\.\.\/lib\/express['"]/i],
    filePatterns: [/lib\/express\.js$/i],
    codePatterns: [/express\(\)/, /express\.Router\(\)/],
    reason: 'Fast, minimalist Node.js web framework handling REST API routing and middleware'
  },
  {
    name: 'Django',
    category: 'backend',
    packages: ['Django', 'django'],
    imports: [/import django/i, /from django\./i],
    filePatterns: [/manage\.py$/i, /settings\.py$/i, /wsgi\.py$/i, /asgi\.py$/i],
    codePatterns: [/django\.urls/, /django\.db\.models/, /django\.conf/],
    reason: 'High-level Python Web framework encouraging rapid development'
  },
  {
    name: 'FastAPI',
    category: 'backend',
    packages: ['fastapi', 'uvicorn'],
    imports: [/from fastapi import/i, /import fastapi/i],
    filePatterns: [],
    codePatterns: [/FastAPI\(\)/, /@app\.get\(/, /@app\.post\(/, /APIRouter\(\)/],
    reason: 'Modern, fast (high-performance) web framework for building APIs with Python'
  },
  {
    name: 'Spring Boot',
    category: 'backend',
    packages: [],
    imports: [/import org\.springframework/i],
    filePatterns: [/pom\.xml$/i, /build\.gradle$/i, /Application\.java$/i],
    codePatterns: [/@SpringBootApplication/, /@RestController/, /@Service/],
    reason: 'Java-based framework for building microservices and enterprise applications'
  },
  {
    name: 'Go / Gin',
    category: 'backend',
    packages: [],
    imports: [/"github\.com\/gin-gonic\/gin"/i],
    filePatterns: [/go\.mod$/i, /main\.go$/i],
    codePatterns: [/gin\.Default\(\)/, /router\.GET\(/, /router\.POST\(/],
    reason: 'Gin web framework for building high-performance REST APIs in Go'
  },

  // --- DATABASES & ORMS ---
  {
    name: 'MongoDB / Mongoose',
    category: 'database',
    packages: ['mongoose', 'mongodb', 'pymongo', 'motor'],
    imports: [/from ['"]mongoose['"]/i, /require\(['"]mongoose['"]\)/i, /from ['"]mongodb['"]/i, /import pymongo/i],
    filePatterns: [],
    codePatterns: [/mongoose\.connect\(/, /new mongoose\.Schema\(/, /mongoose\.model\(/, /MongoClient\(/, /pymongo\.MongoClient/],
    reason: 'MongoDB NoSQL database configuration and ODM mapping detected'
  },
  {
    name: 'PostgreSQL',
    category: 'database',
    packages: ['pg', 'psycopg2', 'psycopg2-binary', 'asyncpg', 'lib/pq'],
    imports: [/from ['"]pg['"]/i, /require\(['"]pg['"]\)/i, /import psycopg2/i, /import asyncpg/i, /"github\.com\/lib\/pq"/i],
    filePatterns: [],
    codePatterns: [/new Client\(/, /new Pool\(/, /psycopg2\.connect/, /asyncpg\.create_pool/],
    reason: 'PostgreSQL relational database client and connection pooling'
  },
  {
    name: 'MySQL',
    category: 'database',
    packages: ['mysql', 'mysql2', 'pymysql', 'mysql-connector-python'],
    imports: [/from ['"]mysql2?['"]/i, /require\(['"]mysql2?['"]\)/i, /import pymysql/i],
    filePatterns: [],
    codePatterns: [/mysql\.createConnection/, /mysql\.createPool/, /pymysql\.connect/],
    reason: 'MySQL relational database client configuration'
  },
  {
    name: 'Prisma ORM',
    category: 'database',
    packages: ['@prisma/client', 'prisma'],
    imports: [/from ['"]@prisma\/client['"]/i, /require\(['"]@prisma\/client['"]\)/i],
    filePatterns: [/schema\.prisma$/i],
    codePatterns: [/new PrismaClient\(\)/, /prisma\./],
    reason: 'Prisma Object-Relational Mapper (ORM) defining database schema and access'
  },
  {
    name: 'SQLAlchemy',
    category: 'database',
    packages: ['SQLAlchemy', 'sqlalchemy'],
    imports: [/from sqlalchemy /i, /import sqlalchemy/i],
    filePatterns: [],
    codePatterns: [/create_engine\(/, /sessionmaker\(/, /declarative_base\(\)/],
    reason: 'Python SQL toolkit and Object Relational Mapper'
  },
  {
    name: 'Redis',
    category: 'database',
    packages: ['redis', 'ioredis', 'redis-py'],
    imports: [/from ['"]redis['"]/i, /require\(['"]redis['"]\)/i, /from ['"]ioredis['"]/i, /import redis/i],
    filePatterns: [],
    codePatterns: [/createClient\(/, /new Redis\(/, /redis\.Redis\(/],
    reason: 'Redis in-memory data structure store used for caching and sessions'
  },

  // --- AUTHENTICATION ---
  {
    name: 'JWT Authentication',
    category: 'auth',
    packages: ['jsonwebtoken', 'jwt-decode', 'jose', 'PyJWT', 'python-jose'],
    imports: [/from ['"]jsonwebtoken['"]/i, /require\(['"]jsonwebtoken['"]\)/i, /import jwt/i],
    filePatterns: [],
    codePatterns: [/jwt\.sign\(/, /jwt\.verify\(/, /jwt\.encode\(/, /jwt\.decode\(/],
    reason: 'JSON Web Token (JWT) stateless authentication and route authorization'
  },
  {
    name: 'NextAuth / Auth.js',
    category: 'auth',
    packages: ['next-auth', '@auth/core'],
    imports: [/from ['"]next-auth['"]/i, /require\(['"]next-auth['"]\)/i],
    filePatterns: [/\[\.\.\.nextauth\]\.(js|ts)$/i, /auth\.(js|ts)$/i],
    codePatterns: [/NextAuth\(/, /Providers\./],
    reason: 'Complete open-source authentication solution for Next.js/React applications'
  },

  // --- UPLOADS & UTILITIES ---
  {
    name: 'Multer',
    category: 'backend',
    packages: ['multer'],
    imports: [/from ['"]multer['"]/i, /require\(['"]multer['"]\)/i],
    filePatterns: [],
    codePatterns: [/multer\.diskStorage\(/, /multer\(/],
    reason: 'Middleware for handling multipart/form-data and file uploads'
  },

  // --- DEPLOYMENT & CLOUD ---
  {
    name: 'Vercel',
    category: 'deployment',
    packages: [],
    imports: [],
    filePatterns: [/vercel\.json$/i],
    codePatterns: [],
    reason: 'Vercel deployment configuration for frontend static hosting and edge routing'
  },
  {
    name: 'Render',
    category: 'deployment',
    packages: [],
    imports: [],
    filePatterns: [/render\.yaml$/i],
    codePatterns: [],
    reason: 'Render infrastructure-as-code configuration for backend cloud services'
  },
  {
    name: 'Docker',
    category: 'deployment',
    packages: [],
    imports: [],
    filePatterns: [/Dockerfile$/i, /docker-compose\.ya?ml$/i],
    codePatterns: [/FROM\s+\w+/, /services:/],
    reason: 'Containerized deployment configuration using Docker'
  }
]

/**
 * Finds 1-indexed line numbers of a search term in raw file content.
 */
function findLineNumbers(content, pattern) {
  if (!content) return null
  const lines = content.split('\n')
  const matchedLines = []

  for (let i = 0; i < lines.length; i++) {
    if (typeof pattern === 'string') {
      if (lines[i].includes(pattern)) {
        matchedLines.push(i + 1)
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(lines[i])) {
        matchedLines.push(i + 1)
      }
    }
  }

  if (matchedLines.length === 0) return null
  if (matchedLines.length === 1) return `Line ${matchedLines[0]}`
  if (matchedLines.length <= 3) return `Lines ${matchedLines.join(', ')}`
  return `Lines ${matchedLines[0]}-${matchedLines[matchedLines.length - 1]}`
}

/**
 * Builds evidence-backed technology detections.
 * Strictly eliminates unsupported technologies.
 */
export function buildTechnologyEvidence(allTreePaths, packageJson = {}, keyFiles = []) {
  const deps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  }
  const depKeys = Object.keys(deps)
  const results = []

  // Get raw package.json string from keyFiles for line-number extraction
  const pkgFile = keyFiles.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'))
  const rawPkgContent = pkgFile?.content || ''

  for (const tech of TECHNOLOGY_CATALOG) {
    const matchedFiles = new Set()
    const evidenceReasons = []

    // 1. Check package manifest (package.json)
    const matchedPkg = depKeys.find(pkgName => tech.packages.includes(pkgName))
    if (matchedPkg) {
      matchedFiles.add('package.json')
      const lineInfo = findLineNumbers(rawPkgContent, `"${matchedPkg}"`)
      const lineStr = lineInfo ? ` (${lineInfo})` : ''
      evidenceReasons.push(`Declared in package.json${lineStr} (${matchedPkg} v${deps[matchedPkg]})`)
    } else if (packageJson.name && tech.packages.includes(packageJson.name)) {
      matchedFiles.add('package.json')
      evidenceReasons.push(`Repository is the source implementation of ${tech.name} (name: "${packageJson.name}")`)
    } else {
      // Check other manifests (requirements.txt, go.mod, pom.xml, etc.)
      for (const file of keyFiles) {
        if (/requirements\.txt$|pyproject\.toml$|go\.mod$|pom\.xml$|build\.gradle$|composer\.json$|gemfile$/i.test(file.path)) {
          for (const pkg of tech.packages) {
            const regex = new RegExp(`\\b${pkg}\\b`, 'i')
            if (regex.test(file.content)) {
              matchedFiles.add(file.path)
              const lineInfo = findLineNumbers(file.content, regex)
              const lineStr = lineInfo ? ` (${lineInfo})` : ''
              evidenceReasons.push(`Declared in ${file.path}${lineStr} (${pkg})`)
              break
            }
          }
        }
      }
    }

    // 2. Check dedicated file patterns in repository tree
    for (const pattern of tech.filePatterns) {
      for (const filePath of allTreePaths) {
        if (pattern.test(filePath)) {
          matchedFiles.add(filePath)
        }
      }
    }

    // 3. Check imports and code patterns in fetched source files
    for (const file of keyFiles) {
      let codeMatched = false

      // Check imports
      for (const importPattern of tech.imports) {
        if (importPattern.test(file.content)) {
          matchedFiles.add(file.path)
          const lineInfo = findLineNumbers(file.content, importPattern)
          const lineStr = lineInfo ? ` (${lineInfo})` : ''
          evidenceReasons.push(`Imported in ${file.path}${lineStr}`)
          codeMatched = true
          break
        }
      }

      // Check code signatures
      if (!codeMatched && tech.codePatterns) {
        for (const codePattern of tech.codePatterns) {
          if (codePattern.test(file.content)) {
            matchedFiles.add(file.path)
            const lineInfo = findLineNumbers(file.content, codePattern)
            const lineStr = lineInfo ? ` (${lineInfo})` : ''
            evidenceReasons.push(`Usage pattern detected in ${file.path}${lineStr}`)
            break
          }
        }
      }
    }

    // Determine confidence: MUST have concrete evidence to be included
    let confidence = null
    const hasManifestEvidence = Array.from(matchedFiles).some(f => /package\.json|requirements\.txt|go\.mod|pom\.xml|pyproject\.toml/i.test(f))
    
    if (hasManifestEvidence && matchedFiles.size > 1) {
      confidence = 'high'
    } else if (hasManifestEvidence || (tech.packages.length === 0 && matchedFiles.size > 0)) {
      confidence = 'high'
    } else if (matchedFiles.size > 0) {
      confidence = 'medium'
    }

    // Only include if evidence exists
    if (confidence && matchedFiles.size > 0) {
      const fileList = Array.from(matchedFiles)
      const primaryReason = evidenceReasons.length > 0 
        ? evidenceReasons.slice(0, 2).join('; ') 
        : tech.reason

      results.push({
        name: tech.name,
        category: tech.category,
        confidence,
        files: fileList,
        reason: primaryReason
      })
    }
  }

  return results
}

/**
 * Builds rich, evidence-based file descriptions from actual file contents.
 */
export function buildFileEvidence(keyFiles) {
  const fileEvidenceList = []

  for (const file of keyFiles) {
    const { path: filePath, content } = file
    const lower = filePath.toLowerCase()
    let category = 'other'
    let importance = 'medium'
    let reason = 'Key codebase source file.'

    if (/package\.json$/i.test(lower)) {
      category = 'config'
      importance = 'high'
      reason = 'Project manifest defining metadata, dependencies, scripts, and runtime packages.'
    } else if (/render\.yaml$/i.test(lower)) {
      category = 'config'
      importance = 'high'
      reason = 'Render cloud service deployment specification for backend web services.'
    } else if (/vercel\.json$/i.test(lower)) {
      category = 'config'
      importance = 'high'
      reason = 'Vercel configuration defining single-page application rewrites and static routing.'
    } else if (/supabase_schema\.sql$/i.test(lower)) {
      category = 'database_schema'
      importance = 'high'
      reason = 'PostgreSQL database schema defining tables, relational constraints, and security policies for Supabase.'
    } else if (/server\.js$|app\.js$|main\.py$|main\.go$|Application\.java$/i.test(lower)) {
      category = 'entryPoint'
      importance = 'high'
      reason = 'Backend server entry point configuring server, middleware, and API endpoints.'
    } else if (/main\.(jsx|tsx|js|ts)$/i.test(lower)) {
      category = 'entryPoint'
      importance = 'high'
      reason = 'Client-side entry point that initializes the React application root in the DOM.'
    } else if (/App\.(jsx|tsx|js|ts|vue|svelte)$/i.test(lower)) {
      category = 'routing'
      importance = 'high'
      reason = 'Root application component managing application state, layout structure, and route definitions.'
    } else if (/context\/.*Context\.(jsx|tsx|js)$/i.test(lower)) {
      category = 'context'
      importance = 'high'
      reason = 'React Context provider managing centralized state and data synchronization across components.'
    } else if (/lib\/supabase\.(js|ts)$/i.test(lower)) {
      category = 'service'
      importance = 'high'
      reason = 'Initializes and exports the Supabase client instance using environment credentials.'
    } else if (/routes\/|urls\.py$|.*Routes?\.(js|ts|go|py)$/i.test(lower)) {
      category = 'routes'
      importance = 'high'
      reason = 'Defines API route handlers for specific resource endpoints.'
    } else if (/controllers\/|views\.py$|.*Controller\.(js|ts|java|go)$/i.test(lower)) {
      category = 'controller'
      importance = 'high'
      reason = 'Controller module executing business logic, data validation, and database operations.'
    } else if (/models\/.*|schemas\/.*|.*Entity\.java$|.*\.prisma$/i.test(lower)) {
      category = 'model'
      importance = 'high'
      reason = 'Database model schema defining entity fields, validation rules, and indexes.'
    } else if (/(?:components|pages|views)\/.*\.(jsx|tsx|vue|svelte)$/i.test(lower)) {
      category = 'component'
      importance = 'medium'
      reason = 'Reusable user interface component for rendering interactive views.'
    } else if (/(requirements\.txt|pyproject\.toml|pom\.xml|build\.gradle|go\.mod)$/i.test(lower)) {
      category = 'config'
      importance = 'high'
      reason = 'Project manifest defining dependencies and runtime packages.'
    }

    fileEvidenceList.push({
      path: filePath,
      category,
      importance,
      reason
    })
  }

  return fileEvidenceList
}

/**
 * Extracts verified file-to-file and component relationships.
 */
export function buildRelationshipEvidence(keyFiles, allTreePaths) {
  const relationships = []
  const treeSet = new Set(allTreePaths)

  for (const file of keyFiles) {
    const { path: sourcePath, content } = file
    const sourceDir = path.posix.dirname(sourcePath)

    // Check imports and requires across languages
    // JS/TS: import { x } from 'y' or require('y')
    // Python: from x import y or import y
    // Go: import "y"
    // Java: import x.y
    const importRegex = /(?:import\s+(?:[\w*\s{},]+)\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)|from\s+([\w.]+)\s+import|import\s+['"]([^'"]+)['"]|import\s+([\w.]+))/g
    let match

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2] || match[3] || match[4] || match[5]
      if (!importPath) continue

      // Handle relative imports (JS/TS) or package local imports
      if (importPath.startsWith('.')) {
        let normalized = path.posix.normalize(`${sourceDir}/${importPath}`)
        
        let targetFile = null
        const extensions = ['', '.jsx', '.tsx', '.js', '.ts', '/index.js', '/index.jsx', '/index.ts', '.py', '/__init__.py', '.go', '.java']
        for (const ext of extensions) {
          const candidate = normalized + ext
          if (treeSet.has(candidate)) {
            targetFile = candidate
            break
          }
        }

        if (targetFile && targetFile !== sourcePath) {
          let relationshipType = 'imports'
          if (/(App|main|application)\.(jsx|tsx|py|go|java)/i.test(sourcePath) && /(components|pages|views|handlers)/i.test(targetFile)) {
            relationshipType = 'routes to and renders'
          } else if (/context/i.test(sourcePath) && /lib\/supabase/i.test(targetFile)) {
            relationshipType = 'uses Supabase client from'
          } else if (/(server|app|main)\.(js|py|go)/i.test(sourcePath) && /(routes|urls)/i.test(targetFile)) {
            relationshipType = 'mounts API router'
          } else if (/(routes|urls)/i.test(sourcePath) && /(controllers|views|handlers)/i.test(targetFile)) {
            relationshipType = 'delegates request handling to'
          } else if (/(controllers|views|handlers)/i.test(sourcePath) && /(models|schemas)/i.test(targetFile)) {
            relationshipType = 'queries and updates model'
          }

          relationships.push({
            from: sourcePath,
            to: targetFile,
            relationship: relationshipType,
            evidenceFile: sourcePath
          })
        }
      } 
      // Handle key external package imports for architecture graph
      else if (importPath.startsWith('@supabase/supabase-js') || importPath.startsWith('supabase')) {
        relationships.push({
          from: sourcePath,
          to: 'Supabase Database',
          relationship: 'connects to PostgreSQL via Supabase SDK',
          evidenceFile: sourcePath
        })
      } else if (importPath.startsWith('@google/generative-ai') || importPath.startsWith('google.generativeai') || importPath.startsWith('openai')) {
        relationships.push({
          from: sourcePath,
          to: 'AI Provider API',
          relationship: 'sends prompts to AI model',
          evidenceFile: sourcePath
        })
      } else if (importPath === 'mongoose' || importPath === 'pymongo' || importPath === 'motor') {
        relationships.push({
          from: sourcePath,
          to: 'MongoDB Database',
          relationship: 'executes queries against MongoDB',
          evidenceFile: sourcePath
        })
      } else if (importPath === 'pg' || importPath === 'psycopg2' || importPath === 'asyncpg') {
        relationships.push({
          from: sourcePath,
          to: 'PostgreSQL Database',
          relationship: 'executes queries against PostgreSQL',
          evidenceFile: sourcePath
        })
      } else if (importPath === 'mysql' || importPath === 'mysql2' || importPath === 'pymysql') {
        relationships.push({
          from: sourcePath,
          to: 'MySQL Database',
          relationship: 'executes queries against MySQL',
          evidenceFile: sourcePath
        })
      }
    }
  }

  // Deduplicate relationships
  const uniqueKeys = new Set()
  const uniqueRelationships = []
  for (const rel of relationships) {
    const key = `${rel.from}->${rel.to}:${rel.relationship}`
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key)
      uniqueRelationships.push(rel)
    }
  }

  return uniqueRelationships
}

/**
 * Rules for auditing specific technical documentation claims.
 */
const AUDIT_CLAIM_RULES = [
  {
    claim: 'Google Gemini AI Multimodal Medicine Scanning',
    category: 'AI Services',
    subject: 'Google Gemini',
    keywords: [/gemini/i, /generative-ai/i, /medicine scanner/i, /multimodal.*ai/i],
    packages: ['@google/generative-ai', '@google/genai'],
    importPatterns: [/from ['"]@google\/generative-ai['"]/i, /require\(['"]@google\/generative-ai['"]\)/i],
    codePatterns: [/GoogleGenerativeAI/, /getGenerativeModel/],
    fileMatches: [/AIMedicineScanner/i, /AIEmergencyAssistant/i],
    searchedLocations: ['package.json (dependencies)', 'src/components/AIMedicineScanner.jsx', 'src/components/AIEmergencyAssistant.jsx'],
    positiveReason: '@google/generative-ai SDK initialized for multimodal vision prompts',
    negativeReason: 'No @google/generative-ai dependency or Gemini model invocations detected'
  },
  {
    claim: 'Supabase PostgreSQL Database & Authentication',
    category: 'Database & Auth',
    subject: 'Supabase',
    keywords: [/supabase/i],
    packages: ['@supabase/supabase-js', '@supabase/ssr'],
    importPatterns: [/from ['"]@supabase\/supabase-js['"]/i, /require\(['"]@supabase\/supabase-js['"]\)/i],
    codePatterns: [/createClient\(/, /supabase\.from\(/, /supabase\.auth/],
    fileMatches: [/supabase_schema\.sql$/i, /supabase\.(js|ts)$/i],
    searchedLocations: ['package.json (dependencies)', 'src/lib/supabase.js', 'supabase_schema.sql'],
    positiveReason: '@supabase/supabase-js client initialized and SQL schema present',
    negativeReason: 'No Supabase client, credentials configuration, or schema files detected'
  },
  {
    claim: 'React-Webcam Live Camera Capture',
    category: 'Frontend',
    subject: 'React Webcam',
    keywords: [/webcam/i, /camera stream/i, /live webcam/i],
    packages: ['react-webcam'],
    importPatterns: [/from ['"]react-webcam['"]/i],
    codePatterns: [/<Webcam/],
    fileMatches: [/AIMedicineScanner/i],
    searchedLocations: ['package.json (dependencies)', 'src/components/AIMedicineScanner.jsx'],
    positiveReason: 'react-webcam integrated for real-time packaging and label scanning',
    negativeReason: 'No react-webcam dependency or camera stream components detected'
  },
  {
    claim: 'Leaflet Interactive Geospatial Maps',
    category: 'Frontend',
    subject: 'Leaflet Maps',
    keywords: [/leaflet/i, /interactive map/i, /geospatial/i],
    packages: ['leaflet', 'react-leaflet'],
    importPatterns: [/from ['"]leaflet['"]/i, /from ['"]react-leaflet['"]/i],
    codePatterns: [/<MapContainer/, /L\.map\(/],
    fileMatches: [/LiveMap\.(jsx|tsx|js)$/i, /Map\.(jsx|tsx|js)$/i],
    searchedLocations: ['package.json (dependencies)', 'src/components/LiveMap.jsx'],
    positiveReason: 'leaflet and react-leaflet configured for live map rendering',
    negativeReason: 'No leaflet dependencies or map containers found in codebase'
  },
  {
    claim: 'Tailwind CSS Utility-First Styling',
    category: 'Styling',
    subject: 'Tailwind CSS',
    keywords: [/tailwind/i, /utility-first/i],
    packages: ['tailwindcss', 'postcss', 'autoprefixer'],
    importPatterns: [],
    codePatterns: [/@tailwind/],
    fileMatches: [/tailwind\.config/i, /postcss\.config/i],
    searchedLocations: ['package.json (devDependencies)', 'tailwind.config.js', 'postcss.config.js'],
    positiveReason: 'tailwindcss configured in package manifest and build config',
    negativeReason: 'No tailwind configuration or postCSS build setup found'
  },
  {
    claim: 'JWT Stateless Authentication',
    category: 'Authentication',
    subject: 'JWT',
    keywords: [/jwt/i, /jsonwebtoken/i, /stateless auth/i],
    packages: ['jsonwebtoken', 'jwt-decode', 'jose'],
    importPatterns: [/from ['"]jsonwebtoken['"]/i, /require\(['"]jsonwebtoken['"]\)/i],
    codePatterns: [/jwt\.sign\(/, /jwt\.verify\(/],
    fileMatches: [/authMiddleware/i, /authController/i],
    searchedLocations: ['package.json (dependencies)', 'backend/middleware/authMiddleware.js', 'backend/controllers/authController.js'],
    positiveReason: 'jsonwebtoken library used for token signing and verification',
    negativeReason: 'No jsonwebtoken dependency or token verification middleware detected'
  },
  {
    claim: 'MongoDB / Mongoose Document Persistence',
    category: 'Database',
    subject: 'MongoDB',
    keywords: [/mongodb/i, /mongoose/i, /nosql/i],
    packages: ['mongoose', 'mongodb'],
    importPatterns: [/from ['"]mongoose['"]/i, /require\(['"]mongoose['"]\)/i, /from ['"]mongodb['"]/i],
    codePatterns: [/mongoose\.connect\(/, /new mongoose\.Schema\(/],
    fileMatches: [/models\/.*\.js$/i],
    searchedLocations: ['package.json (dependencies)', 'backend/models/', 'database connection files'],
    positiveReason: 'mongoose package and Schema models detected',
    negativeReason: 'No mongodb or mongoose packages declared in dependencies or imports'
  },
  {
    claim: 'Express.js REST API Server',
    category: 'Backend',
    subject: 'Express',
    keywords: [/express/i, /rest api/i, /express server/i],
    packages: ['express'],
    importPatterns: [/from ['"]express['"]/i, /require\(['"]express['"]\)/i],
    codePatterns: [/express\(\)/, /app\.use\(/],
    fileMatches: [/server\.js$/i, /app\.js$/i],
    searchedLocations: ['package.json (dependencies)', 'server.js', 'backend/server.js'],
    positiveReason: 'Express application instance and routing middleware configured',
    negativeReason: 'No Express framework dependency or backend server files detected'
  },
  {
    claim: 'Redis In-Memory Caching & Sessions',
    category: 'Database',
    subject: 'Redis',
    keywords: [/redis/i, /in-memory cache/i],
    packages: ['redis', 'ioredis'],
    importPatterns: [/from ['"]redis['"]/i, /from ['"]ioredis['"]/i],
    codePatterns: [/createClient\(/, /new Redis\(/],
    fileMatches: [/redis/i],
    searchedLocations: ['package.json (dependencies)', 'caching configuration files', 'source imports'],
    positiveReason: 'Redis client initialized for in-memory caching',
    negativeReason: 'No redis or ioredis packages detected in dependencies or codebase'
  },
  {
    claim: 'Docker Containerized Deployment',
    category: 'Deployment',
    subject: 'Docker',
    keywords: [/docker/i, /container/i, /docker-compose/i],
    packages: [],
    importPatterns: [],
    codePatterns: [/FROM\s+\w+/, /services:/],
    fileMatches: [/Dockerfile$/i, /docker-compose\.ya?ml$/i],
    searchedLocations: ['Dockerfile', 'docker-compose.yml'],
    positiveReason: 'Dockerfile or docker-compose configuration file present in repository',
    negativeReason: 'No Dockerfile or container configuration found in repository tree'
  },
  {
    claim: 'Vercel Edge & SPA Deployment',
    category: 'Deployment',
    subject: 'Vercel',
    keywords: [/vercel/i, /vercel deployment/i],
    packages: [],
    importPatterns: [],
    codePatterns: [],
    fileMatches: [/vercel\.json$/i],
    searchedLocations: ['vercel.json'],
    positiveReason: 'vercel.json present specifying SPA rewrites and edge hosting',
    negativeReason: 'No vercel.json or Vercel routing configuration found'
  },
  {
    claim: 'Render Cloud Web Service Deployment',
    category: 'Deployment',
    subject: 'Render',
    keywords: [/render\.com/i, /render\.yaml/i, /render platform/i],
    packages: [],
    importPatterns: [],
    codePatterns: [],
    fileMatches: [/render\.yaml$/i],
    searchedLocations: ['render.yaml'],
    positiveReason: 'render.yaml infrastructure-as-code configuration detected',
    negativeReason: 'No render.yaml deployment configuration found in repository'
  }
]

/**
 * Stage 4: Smart Documentation Audit Engine.
 * Audits dynamically extracted README claims against actual code evidence.
 */
export function buildDocumentationAudit(readmeContent, detectedTechs = [], allTreePaths = [], keyFiles = [], packageJson = {}, dynamicClaims = []) {
  if (!readmeContent || readmeContent === 'No README found') {
    return []
  }

  const deps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  }
  const depKeys = Object.keys(deps)

  // Get raw package.json content for line numbers
  const pkgFile = keyFiles.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'))
  const rawPkgContent = pkgFile?.content || ''

  const auditResults = []

  // Check which database is present to detect alternative technology drift
  const activeDatabases = detectedTechs.filter(t => t.category === 'database').map(t => t.name)

  for (const rawClaim of dynamicClaims) {
    const positiveEvidence = []
    const negativeEvidence = []
    let searchedLocations = ['package manifests', 'key source files']

    // Try to map the dynamically extracted subject to our known TECHNOLOGY_CATALOG
    const matchedCatalogTech = TECHNOLOGY_CATALOG.find(t => 
      t.name.toLowerCase().includes(rawClaim.subject.toLowerCase()) || 
      rawClaim.subject.toLowerCase().includes(t.name.toLowerCase())
    )

    if (matchedCatalogTech) {
      // Use deterministic known rules for this technology
      searchedLocations = ['package.json (dependencies)', 'requirements.txt', 'go.mod', 'pom.xml', 'source imports', 'initialization signatures']
      
      // 1. Check Package Manifest
      const matchedPkg = depKeys.find(p => matchedCatalogTech.packages.includes(p))
      if (matchedPkg) {
        const lineInfo = findLineNumbers(rawPkgContent, `"${matchedPkg}"`)
        positiveEvidence.push({
          type: 'positive',
          file: pkgFile?.path || 'package.json',
          lines: lineInfo || undefined,
          reason: `${matchedPkg} (v${deps[matchedPkg]}) declared in dependencies`
        })
      } else {
        // Check other manifests
        for (const file of keyFiles) {
          if (/requirements\.txt$|pyproject\.toml$|go\.mod$|pom\.xml$|build\.gradle$|composer\.json$|gemfile$/i.test(file.path)) {
            for (const pkg of matchedCatalogTech.packages) {
              const regex = new RegExp(`\\b${pkg}\\b`, 'i')
              if (regex.test(file.content)) {
                const lineInfo = findLineNumbers(file.content, regex)
                positiveEvidence.push({
                  type: 'positive',
                  file: file.path,
                  lines: lineInfo || undefined,
                  reason: `Declared in ${file.path} (${pkg})`
                })
                break
              }
            }
          }
        }
      }

      // 2. Check File Tree Matches
      for (const filePattern of matchedCatalogTech.filePatterns) {
        const matchedPath = allTreePaths.find(p => filePattern.test(p))
        if (matchedPath) {
          positiveEvidence.push({
            type: 'positive',
            file: matchedPath,
            reason: `Dedicated configuration file '${matchedPath}' present in repository`
          })
        }
      }

      // 3. Check Code Imports & Patterns in Key Files
      for (const file of keyFiles) {
        for (const impPattern of matchedCatalogTech.imports) {
          if (impPattern.test(file.content)) {
            const lineInfo = findLineNumbers(file.content, impPattern)
            positiveEvidence.push({
              type: 'positive',
              file: file.path,
              lines: lineInfo || undefined,
              reason: `Direct import of ${matchedCatalogTech.name} detected`
            })
            break
          }
        }
        for (const codePattern of matchedCatalogTech.codePatterns) {
          if (codePattern.test(file.content)) {
            const lineInfo = findLineNumbers(file.content, codePattern)
            positiveEvidence.push({
              type: 'positive',
              file: file.path,
              lines: lineInfo || undefined,
              reason: `${matchedCatalogTech.name} usage signature detected`
            })
            break
          }
        }
      }

      if (positiveEvidence.length === 0) {
        negativeEvidence.push({
          type: 'negative',
          file: 'codebase',
          reason: `No manifest dependencies, imports, or code signatures detected for ${matchedCatalogTech.name}`
        })
      }

    } else {
      // Fallback: Best-effort string matching for unknown technology claim
      const searchSubject = rawClaim.subject
      const regex = new RegExp(searchSubject, 'i')

      if (regex.test(rawPkgContent)) {
        const lineInfo = findLineNumbers(rawPkgContent, regex)
        positiveEvidence.push({
          type: 'positive',
          file: pkgFile?.path || 'package.json',
          lines: lineInfo || undefined,
          reason: `Mentioned in package.json manifest`
        })
      }

      for (const file of keyFiles) {
        if (regex.test(file.content)) {
          const lineInfo = findLineNumbers(file.content, regex)
          positiveEvidence.push({
            type: 'positive',
            file: file.path,
            lines: lineInfo || undefined,
            reason: `Detected in source code file`
          })
        }
      }

      if (positiveEvidence.length === 0) {
        negativeEvidence.push({
          type: 'negative',
          file: 'codebase',
          reason: `Keyword '${searchSubject}' not found in any scanned manifests or source files`
        })
      }
    }

    // Deduplicate positive evidence files
    const uniqueEvidenceMap = new Map()
    for (const ev of positiveEvidence) {
      const key = `${ev.file}:${ev.reason}`
      if (!uniqueEvidenceMap.has(key)) {
        uniqueEvidenceMap.set(key, ev)
      }
    }
    const uniquePositiveEvidence = Array.from(uniqueEvidenceMap.values())

    // 4. Calculate Verdict & Confidence
    let verdict = 'NOT_FOUND'
    let confidence = 'HIGH'
    let summary = ''
    let alternativeFound = null

    if (uniquePositiveEvidence.length >= 2) {
      verdict = 'VERIFIED'
      confidence = 'HIGH'
      summary = `Direct code evidence supports this README claim through dependencies and source code execution.`
    } else if (uniquePositiveEvidence.length === 1) {
      verdict = 'VERIFIED'
      confidence = 'HIGH'
      summary = `Verified in repository codebase evidence.`
    } else {
      verdict = 'NOT_FOUND'
      confidence = 'HIGH'

      // Check for contradictory alternative technologies
      if (rawClaim.category.toLowerCase().includes('database') && activeDatabases.length > 0 && !activeDatabases.some(db => db.toLowerCase().includes(rawClaim.subject.toLowerCase()))) {
        alternativeFound = `Repository utilizes ${activeDatabases.join(', ')} instead.`
        summary = `Mentioned in README, but no evidence was detected in the codebase. ${alternativeFound}`
      } else {
        summary = `Mentioned in README documentation, but no supporting dependencies or code implementations were detected in the repository.`
      }
    }

    auditResults.push({
      claim: rawClaim.claim,
      category: rawClaim.category,
      subject: rawClaim.subject,
      verdict,
      confidence,
      summary,
      evidence: uniquePositiveEvidence,
      negativeEvidence,
      searchedEvidence: searchedLocations,
      alternativeFound
    })
  }

  return auditResults
}

/**
 * Stage 5: Repository Health & Documentation Drift Engine.
 * Computes accuracy score, architectural footprint, drift alerts, and README sync suggestions.
 */
export function buildHealthAndDriftReport(scanResult = {}, detectedTechs = [], documentationAudit = [], keyFiles = [], readmeContent = '') {
  const totalClaims = documentationAudit.length
  const verifiedCount = documentationAudit.filter(a => a.verdict === 'VERIFIED').length
  const partialCount = documentationAudit.filter(a => a.verdict === 'PARTIAL').length
  const notFoundCount = documentationAudit.filter(a => a.verdict === 'NOT_FOUND').length

  // Calculate Accuracy Score (0 - 100%)
  const accuracyScore = totalClaims === 0 
    ? 100 
    : Math.round(((verifiedCount + (0.5 * partialCount)) / totalClaims) * 100)

  let statusLabel = 'EXCELLENT ALIGNMENT'
  let statusGrade = 'A'
  if (accuracyScore < 70) {
    statusLabel = 'SIGNIFICANT DRIFT'
    statusGrade = 'C'
  } else if (accuracyScore < 90) {
    statusLabel = 'MODERATE DRIFT'
    statusGrade = 'B'
  }

  // Architectural Profile
  const frontendTech = detectedTechs.find(t => t.category === 'frontend')?.name || 'Standard Web'
  const databaseTech = detectedTechs.find(t => t.category === 'database')?.name || 'None / Static'
  const aiTech = detectedTechs.find(t => t.category === 'ai')?.name || 'None'
  const authTech = detectedTechs.find(t => t.category === 'auth')?.name || (databaseTech.includes('Supabase') ? 'Supabase Auth' : 'None / Public')
  const stylingTech = detectedTechs.find(t => t.category === 'styling')?.name || 'CSS'
  const deployTech = detectedTechs.find(t => t.category === 'deployment')?.name || 'Standard Cloud'

  const classified = scanResult.classifiedFiles || {}
  const stats = scanResult.stats || {}
  
  // Scan Coverage Metrics
  const scanCoverage = {
    coreFilesInspected: keyFiles.length,
    repositoryFilesDiscovered: stats.filteredRelevantFiles || 0,
    manifestFilesInspected: (classified.configs?.length || 0),
    databaseFilesInspected: (classified.models?.length || 0) + keyFiles.filter(f => /schema|\.sql$/i.test(f.path)).length,
    sourceFilesInspected: (classified.components?.length || 0) + (classified.controllers?.length || 0) + (classified.services?.length || 0)
  }

  const footprint = {
    totalFilesScanned: stats.totalScannedFiles || 0,
    relevantFilesCount: stats.filteredRelevantFiles || 0,
    componentsCount: classified.components?.length || 0,
    servicesCount: keyFiles.filter(f => /lib\/|services\/|context\//i.test(f.path)).length,
    routesCount: classified.routes?.length || 0,
    modelsCount: classified.models?.length || 0,
    controllersCount: classified.controllers?.length || 0,
    schemasCount: keyFiles.filter(f => /schema|\.sql$/i.test(f.path)).length
  }

  // Detect Documentation Drift Items
  const driftItems = []

  // 1. Check for claims not found or with contradictory reality
  for (const audit of documentationAudit) {
    if (audit.verdict === 'NOT_FOUND') {
      driftItems.push({
        type: 'mismatch',
        severity: 'high',
        claim: audit.claim,
        documented: `Documented as using ${audit.subject}`,
        reality: audit.alternativeFound || `No ${audit.subject} code evidence detected in scanned files`,
        suggestion: `Update documentation to accurately reflect actual implementation (${audit.alternativeFound ? audit.alternativeFound : 'remove unverified claim'}).`
      })
    } else if (audit.verdict === 'PARTIAL') {
      driftItems.push({
        type: 'partial_drift',
        severity: 'medium',
        claim: audit.claim,
        documented: `Documented: "${audit.claim}"`,
        reality: `Partial evidence found, but complete implementation could not be verified in codebase`,
        suggestion: `Clarify current status or document implementation scope in README.`
      })
    }
  }

  // 2. Check for Undocumented Verified Technologies
  const auditedSubjects = new Set(documentationAudit.map(a => a.subject.toLowerCase()))
  const undocumentedTechs = detectedTechs.filter(t => !auditedSubjects.has(t.name.toLowerCase()))

  for (const uTech of undocumentedTechs.slice(0, 3)) {
    driftItems.push({
      type: 'undocumented_feature',
      severity: 'low',
      claim: `${uTech.name} (${uTech.category.toUpperCase()})`,
      documented: 'Not explicitly documented in README',
      reality: `Active in repository: ${uTech.reason}`,
      suggestion: `Add ${uTech.name} to the project README Tech Stack section.`
    })
  }

  // Generate Suggested README Tech Stack Fix
  const suggestedReadmeMarkdown = [
    `## Verified Tech Stack & Architecture (Repo IQ Grounded)`,
    `- **Frontend Framework:** ${frontendTech}`,
    stylingTech !== 'CSS' ? `- **Styling:** ${stylingTech}` : null,
    aiTech !== 'None' ? `- **AI & Multimodal Services:** ${aiTech}` : null,
    databaseTech !== 'None / Static' ? `- **Database & Persistence:** ${databaseTech}` : null,
    authTech !== 'None / Public' ? `- **Authentication:** ${authTech}` : null,
    deployTech !== 'Standard Cloud' ? `- **Deployment:** ${deployTech}` : null,
    ``,
    `### Key Codebase Highlights`,
    `- **Architecture:** ${footprint.componentsCount} UI Components, ${footprint.servicesCount} Core Services / Contexts`,
    `- **Verified Dependencies:** ${detectedTechs.map(t => t.name).join(', ')}`
  ].filter(Boolean).join('\n')

  return {
    accuracyScore,
    statusLabel,
    statusGrade,
    verifiedCount,
    partialCount,
    notFoundCount,
    totalClaims,
    profile: {
      frontend: frontendTech,
      database: databaseTech,
      ai: aiTech,
      auth: authTech,
      styling: stylingTech,
      deployment: deployTech
    },
    footprint,
    scanCoverage,
    driftItems,
    suggestedReadmeMarkdown
  }
}

