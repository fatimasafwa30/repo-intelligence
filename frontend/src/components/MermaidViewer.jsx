import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Initialize Mermaid with a clean developer tool theme
mermaid.initialize({
  startOnLoad: false,
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
 * Builds a clean, syntax-valid Mermaid graph definition from evidence relationships.
 */
function buildMermaidFromRelationships(relationships = [], fallbackDiagram = '') {
  if (!relationships || relationships.length === 0) {
    if (fallbackDiagram && fallbackDiagram.includes('graph')) {
      return fallbackDiagram
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
  
  // Limit to top 15 most meaningful relationships to keep diagram crisp & readable
  const activeRels = relationships.slice(0, 16)

  for (const rel of activeRels) {
    const fromId = getNodeId(rel.from)
    const toId = getNodeId(rel.to)
    
    // Sanitize labels to prevent Mermaid syntax breaks
    const cleanFrom = (rel.from || '').replace(/["\n\\]/g, '').trim()
    const cleanTo = (rel.to || '').replace(/["\n\\]/g, '').trim()
    const cleanRel = (rel.relationship || '').replace(/["\n\\]/g, '').trim()

    if (cleanFrom && cleanTo) {
      if (cleanRel) {
        lines.push(`    ${fromId}["${cleanFrom}"] -->|"${cleanRel}"| ${toId}["${cleanTo}"]`)
      } else {
        lines.push(`    ${fromId}["${cleanFrom}"] --> ${toId}["${cleanTo}"]`)
      }
    }
  }

  return lines.join('\n')
}

export default function MermaidViewer({ relationships = [], fallbackDiagram = '', title = 'Architecture Graph' }) {
  const containerRef = useRef(null)
  const [svgContent, setSvgContent] = useState('')
  const [error, setError] = useState(null)
  const [useEvidenceGraph, setUseEvidenceGraph] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function renderChart() {
      try {
        setError(null)
        const diagramCode = useEvidenceGraph && relationships?.length > 0
          ? buildMermaidFromRelationships(relationships, fallbackDiagram)
          : (fallbackDiagram || buildMermaidFromRelationships(relationships))

        const uniqueId = `mermaid_chart_${Math.random().toString(36).substring(2, 9)}`
        const { svg } = await mermaid.render(uniqueId, diagramCode)

        if (isMounted) {
          setSvgContent(svg)
        }
      } catch (err) {
        console.warn('Mermaid rendering fallback:', err)
        if (isMounted) {
          setError('Could not render dynamic vector graph.')
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
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
            <pre className="mermaid-code-fallback">{fallbackDiagram || buildMermaidFromRelationships(relationships)}</pre>
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
