import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Initialize Mermaid with clean developer tool theme and error suppression
mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, ui-monospace, SFMono-Regular, monospace',
  themeVariables: {
    primaryColor: '#ffffff',
    primaryTextColor: '#171717',
    primaryBorderColor: '#171717',
    lineColor: '#525252',
    secondaryColor: '#f7f7f5',
    tertiaryColor: '#ffffff',
    edgeLabelBackground: '#f7f7f5'
  }
})

/**
 * Sanitizes raw diagram text from markdown or LLM output.
 */
function sanitizeDiagram(raw = '') {
  if (!raw) return ''
  let cleaned = raw
    .replace(/```(?:mermaid)?\n?/gi, '')
    .replace(/```/g, '')
    .trim()

  if (!cleaned.startsWith('graph') && !cleaned.startsWith('flowchart')) {
    cleaned = 'graph TD\n' + cleaned
  }
  return cleaned
}

/**
 * Builds a clean, syntax-valid Mermaid graph definition from evidence relationships.
 */
function buildMermaidFromRelationships(relationships = [], fallbackDiagram = '') {
  if (!relationships || relationships.length === 0) {
    if (fallbackDiagram && (fallbackDiagram.includes('graph') || fallbackDiagram.includes('flowchart'))) {
      return sanitizeDiagram(fallbackDiagram)
    }
    return `graph TD\n    A["Client Application"] --> B["API / Service Layer"]`
  }

  const nodeMap = new Map()
  let nodeCount = 0

  function getNodeId(name) {
    if (!nodeMap.has(name)) {
      nodeMap.set(name, `node_${nodeCount++}`)
    }
    return nodeMap.get(name)
  }

  const lines = ['graph TD']
  
  // Limit to top 16 most meaningful relationships to keep diagram crisp & readable
  const activeRels = relationships.slice(0, 16)

  for (const rel of activeRels) {
    const fromId = getNodeId(rel.from)
    const toId = getNodeId(rel.to)
    
    // Strictly sanitize labels to prevent Mermaid syntax breaks
    const cleanFrom = (rel.from || '').replace(/["[\]\n\\]/g, ' ').replace(/\s+/g, ' ').trim()
    const cleanTo = (rel.to || '').replace(/["[\]\n\\]/g, ' ').replace(/\s+/g, ' ').trim()
    const cleanRel = (rel.relationship || '').replace(/["[\]|()<>`\n\\]/g, ' ').replace(/\s+/g, ' ').trim()

    if (cleanFrom && cleanTo) {
      if (cleanRel) {
        // Valid Mermaid syntax uses |label| without internal quotes
        lines.push(`    ${fromId}["${cleanFrom}"] -->|${cleanRel}| ${toId}["${cleanTo}"]`)
      } else {
        lines.push(`    ${fromId}["${cleanFrom}"] --> ${toId}["${cleanTo}"]`)
      }
    }
  }

  return lines.length > 1 ? lines.join('\n') : `graph TD\n    A["Client Application"] --> B["API / Service Layer"]`
}

export default function MermaidViewer({ relationships = [], fallbackDiagram = '', title = 'Architecture Graph' }) {
  const containerRef = useRef(null)
  const [svgContent, setSvgContent] = useState('')
  const [error, setError] = useState(null)
  const [useEvidenceGraph, setUseEvidenceGraph] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function renderChart() {
      // Clean up any stray error elements injected into document.body by Mermaid
      document.querySelectorAll('[id^="dmermaid_chart_"]').forEach(el => el.remove())

      try {
        setError(null)
        const diagramCode = useEvidenceGraph && relationships?.length > 0
          ? buildMermaidFromRelationships(relationships, fallbackDiagram)
          : (sanitizeDiagram(fallbackDiagram) || buildMermaidFromRelationships(relationships))

        const uniqueId = `mermaid_chart_${Math.random().toString(36).substring(2, 9)}`
        
        let svg = ''
        try {
          const res = await mermaid.render(uniqueId, diagramCode)
          svg = res.svg
        } catch (firstErr) {
          console.warn('Initial Mermaid render failed, attempting safe evidence fallback:', firstErr)
          document.querySelectorAll('[id^="dmermaid_chart_"]').forEach(el => el.remove())

          // Safe fallback using structured evidence relationships
          const safeFallback = buildMermaidFromRelationships(relationships)
          const retryId = `mermaid_chart_${Math.random().toString(36).substring(2, 9)}`
          const res2 = await mermaid.render(retryId, safeFallback)
          svg = res2.svg
        }

        if (isMounted && svg) {
          setSvgContent(svg)
        }
      } catch (err) {
        console.warn('Mermaid rendering final fallback:', err)
        document.querySelectorAll('[id^="dmermaid_chart_"]').forEach(el => el.remove())
        if (isMounted) {
          setError('Architecture diagram preview is unavailable for this repository.')
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
      document.querySelectorAll('[id^="dmermaid_chart_"]').forEach(el => el.remove())
    }
  }, [relationships, fallbackDiagram, useEvidenceGraph])

  return (
    <div className="mermaid-viewer">
      <div className="mermaid-toolbar">
        <div className="mermaid-title">
          <span className="live-indicator"></span>
          <span>{useEvidenceGraph ? 'EVIDENCE-BACKED RELATIONSHIP GRAPH' : 'GENERATED ARCHITECTURE DIAGRAM'}</span>
        </div>

        {relationships?.length > 0 && fallbackDiagram && (
          <div className="mermaid-toggle-group">
            <button
              type="button"
              className={`mermaid-toggle-btn ${useEvidenceGraph ? 'active' : ''}`}
              onClick={() => setUseEvidenceGraph(true)}
            >
              Verified Connections ({relationships.length})
            </button>
            <button
              type="button"
              className={`mermaid-toggle-btn ${!useEvidenceGraph ? 'active' : ''}`}
              onClick={() => setUseEvidenceGraph(false)}
            >
              Overview Map
            </button>
          </div>
        )}
      </div>

      <div className="mermaid-canvas" ref={containerRef}>
        {svgContent ? (
          <div 
            className="mermaid-svg-wrapper"
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : error ? (
          <div className="mermaid-error">
            <p>{error}</p>
          </div>
        ) : (
          <div className="mermaid-loading">
            <div className="mini-spinner"></div>
            <span>Rendering architecture graph...</span>
          </div>
        )}
      </div>
    </div>
  )
}
