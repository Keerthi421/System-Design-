import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowInstance,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import {
  Box,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code2,
  Database,
  Download,
  FileCode2,
  FilePlus2,
  Folder,
  Gauge,
  Github,
  GitBranch,
  Globe2,
  GripVertical,
  HardDrive,
  Layers3,
  Link2,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Network,
  Plus,
  Save,
  Search,
  Server,
  Settings2,
  Share2,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'

type DesignNodeData = {
  label: string
  type: string
  description?: string
  technology?: string
  color?: string
}

type DesignNode = Node<DesignNodeData>

type ProjectFile = {
  id: string
  name: string
  updatedAt: number
  problem: string
  notes: string
  nodes: DesignNode[]
  edges: Edge[]
}

const palette = [
  { type: 'client', label: 'Client', icon: Globe2, color: '#61dafb' },
  { type: 'service', label: 'Service', icon: Server, color: '#8b5cf6' },
  { type: 'gateway', label: 'API Gateway', icon: Network, color: '#f59e0b' },
  { type: 'load-balancer', label: 'Load Balancer', icon: GitBranch, color: '#22c55e' },
  { type: 'database', label: 'Database', icon: Database, color: '#38bdf8' },
  { type: 'cache', label: 'Cache', icon: Zap, color: '#f97316' },
  { type: 'queue', label: 'Queue', icon: MessageSquareText, color: '#ec4899' },
  { type: 'storage', label: 'Object Storage', icon: HardDrive, color: '#14b8a6' },
  { type: 'cdn', label: 'CDN', icon: Cloud, color: '#60a5fa' },
  { type: 'worker', label: 'Worker', icon: Gauge, color: '#a78bfa' },
  { type: 'external', label: 'External API', icon: Link2, color: '#94a3b8' },
]

const starterTemplates: Record<string, { title: string; problem: string; nodes: DesignNode[]; edges: Edge[] }> = {
  'url-shortener': {
    title: 'URL Shortener',
    problem: 'Design a URL shortener that supports high read traffic, durable links, analytics, and predictable redirects.',
    nodes: [
      node('client', 'Web / Mobile', 80, 220, '#61dafb'),
      node('gateway', 'API Gateway', 330, 220, '#f59e0b'),
      node('service', 'Shortener Service', 590, 130, '#8b5cf6'),
      node('service', 'Redirect Service', 590, 310, '#8b5cf6'),
      node('cache', 'Redis', 870, 90, '#f97316'),
      node('database', 'URL Metadata DB', 870, 280, '#38bdf8'),
      node('queue', 'Analytics Queue', 870, 470, '#ec4899'),
    ],
    edges: edgeSet([
      ['n1', 'n2'], ['n2', 'n3'], ['n2', 'n4'], ['n4', 'n5'], ['n4', 'n6'], ['n4', 'n7'], ['n3', 'n5'], ['n3', 'n6'],
    ]),
  },
  'news-feed': {
    title: 'News Feed',
    problem: 'Design a personalized feed with fan-out trade-offs, caching, ranking, and graceful handling of celebrity accounts.',
    nodes: [
      node('client', 'Clients', 70, 240, '#61dafb'),
      node('gateway', 'API Gateway', 300, 240, '#f59e0b'),
      node('service', 'Feed API', 540, 120, '#8b5cf6'),
      node('service', 'Ranking Service', 540, 360, '#8b5cf6'),
      node('cache', 'Feed Cache', 820, 80, '#f97316'),
      node('database', 'Social Graph DB', 820, 250, '#38bdf8'),
      node('queue', 'Fanout Queue', 820, 430, '#ec4899'),
      node('worker', 'Fanout Workers', 1070, 430, '#a78bfa'),
    ],
    edges: edgeSet([['n1','n2'],['n2','n3'],['n2','n4'],['n3','n5'],['n3','n6'],['n4','n5'],['n6','n7'],['n7','n8']]),
  },
  'chat': {
    title: 'Real-Time Chat',
    problem: 'Design one-to-one and group messaging with online presence, delivery acknowledgements, ordering, and offline delivery.',
    nodes: [
      node('client', 'Clients', 70, 240, '#61dafb'),
      node('gateway', 'Edge Gateway', 300, 240, '#f59e0b'),
      node('service', 'Chat Service', 540, 130, '#8b5cf6'),
      node('service', 'Presence Service', 540, 360, '#8b5cf6'),
      node('queue', 'Message Bus', 800, 130, '#ec4899'),
      node('database', 'Message Store', 800, 360, '#38bdf8'),
      node('cache', 'Presence Cache', 1040, 250, '#f97316'),
    ],
    edges: edgeSet([['n1','n2'],['n2','n3'],['n2','n4'],['n3','n5'],['n3','n6'],['n4','n7'],['n5','n6'],['n4','n6']]),
  },
}

function node(type: string, label: string, x: number, y: number, color: string): DesignNode {
  return {
    id: `n${Math.random().toString(36).slice(2, 8)}`,
    type: 'default',
    position: { x, y },
    data: { label, type, color, description: defaultDescription(type), technology: defaultTechnology(type) },
  }
}

function edgeSet(pairs: string[][]): Edge[] {
  return pairs.map(([source, target], index) => ({
    id: `e-${index}-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
    style: { stroke: '#64748b', strokeWidth: 1.8 },
  }))
}

function defaultDescription(type: string) {
  const map: Record<string, string> = {
    client: 'End-user surface that sends requests into the system.',
    service: 'Stateless application service containing domain logic.',
    gateway: 'Single edge entry point for routing, auth, rate limiting, and observability.',
    'load-balancer': 'Distributes traffic across healthy instances.',
    database: 'Durable source of truth for structured application state.',
    cache: 'Low-latency store for hot or derived data.',
    queue: 'Durable asynchronous boundary between producers and consumers.',
    storage: 'Highly durable object/blob storage for large immutable payloads.',
    cdn: 'Globally distributed edge cache for static or cacheable responses.',
    worker: 'Background consumer for asynchronous, retryable work.',
    external: 'Third-party or independently operated dependency.',
  }
  return map[type] ?? ''
}

function defaultTechnology(type: string) {
  const map: Record<string, string> = {
    client: 'Web / iOS / Android', service: 'Go / Java / TypeScript', gateway: 'Envoy / NGINX', 'load-balancer': 'ALB / NGINX', database: 'PostgreSQL / MySQL', cache: 'Redis', queue: 'Kafka / SQS', storage: 'S3 / GCS', cdn: 'CloudFront / Fastly', worker: 'Go / Python', external: '3rd-party API',
  }
  return map[type] ?? ''
}

function blankFile(id = crypto.randomUUID()): ProjectFile {
  return { id, name: 'Untitled Design', updatedAt: Date.now(), problem: '', notes: '', nodes: [], edges: [] }
}

function cloneTemplate(key: keyof typeof starterTemplates, id = crypto.randomUUID()): ProjectFile {
  const source = starterTemplates[key]
  const ids = source.nodes.map((n) => n.id)
  const clonedNodes = source.nodes.map((n, i) => ({ ...n, id: ids[i], selected: false, data: { ...n.data } }))
  return { id, name: source.title, updatedAt: Date.now(), problem: source.problem, notes: '## Interview notes\n\n- Clarify requirements\n- Estimate traffic and storage\n- Define APIs\n- Identify bottlenecks and failure modes', nodes: clonedNodes, edges: source.edges.map((e) => ({ ...e })) }
}

const seedFile = cloneTemplate('url-shortener')

export default function App() {
  const [files, setFiles] = useState<ProjectFile[]>(() => {
    const stored = localStorage.getItem('system-design-files')
    return stored ? JSON.parse(stored) : [seedFile]
  })
  const [activeId, setActiveId] = useState(() => files[0]?.id ?? seedFile.id)
  const [nodes, setNodes, onNodesChange] = useNodesState<DesignNode>(files.find((f) => f.id === activeId)?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(files.find((f) => f.id === activeId)?.edges ?? [])
  const [reactFlow, setReactFlow] = useState<ReactFlowInstance | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showNotes, setShowNotes] = useState(true)
  const [leftTab, setLeftTab] = useState<'components' | 'files'>('components')
  const [fileName, setFileName] = useState('')
  const dragType = useRef<string | null>(null)

  const activeFile = files.find((f) => f.id === activeId) ?? files[0]
  const selectedNode = nodes.find((n) => n.id === selectedId)

  useEffect(() => {
    localStorage.setItem('system-design-files', JSON.stringify(files))
  }, [files])

  useEffect(() => {
    const file = files.find((f) => f.id === activeId)
    if (!file) return
    setNodes(file.nodes)
    setEdges(file.edges)
    setSelectedId(null)
  }, [activeId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFiles((prev) => prev.map((f) => f.id === activeId ? { ...f, updatedAt: Date.now(), nodes, edges } : f))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [nodes, edges, activeId])

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 }, style: { stroke: '#64748b', strokeWidth: 1.8 } }, eds)), [setEdges])

  const updateActive = (patch: Partial<ProjectFile>) => setFiles((prev) => prev.map((f) => f.id === activeId ? { ...f, ...patch, updatedAt: Date.now() } : f))

  const newFile = () => {
    const fresh = blankFile()
    setFiles((prev) => [fresh, ...prev])
    setActiveId(fresh.id)
    setLeftTab('files')
  }

  const addTemplate = (key: keyof typeof starterTemplates) => {
    const fresh = cloneTemplate(key)
    setFiles((prev) => [fresh, ...prev])
    setActiveId(fresh.id)
    setShowTemplates(false)
  }

  const exportWorkspace = () => {
    const blob = new Blob([JSON.stringify(files, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'system-design-workspace.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importWorkspace = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as ProjectFile[]
        if (!Array.isArray(imported) || !imported.length) throw new Error('Invalid workspace')
        setFiles(imported)
        setActiveId(imported[0].id)
      } catch {
        alert('Could not import this workspace JSON.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const deleteActive = () => {
    if (!activeFile) return
    const remaining = files.filter((f) => f.id !== activeFile.id)
    const next = remaining[0] ?? blankFile()
    setFiles(remaining.length ? remaining : [next])
    setActiveId(next.id)
  }

  const filteredPalette = useMemo(() => palette.filter((p) => p.label.toLowerCase().includes(query.toLowerCase())), [query])

  const addNode = (type: string, position = { x: 260, y: 190 }) => {
    const def = palette.find((p) => p.type === type)!
    const newNode: DesignNode = node(type, def.label, position.x, position.y, def.color)
    setNodes((current) => [...current, newNode])
    setSelectedId(newNode.id)
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    if (!reactFlow || !dragType.current) return
    addNode(dragType.current, reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    dragType.current = null
  }

  const updateSelectedNode = (patch: Partial<DesignNodeData>) => {
    if (!selectedId) return
    setNodes((current) => current.map((n) => n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n))
  }

  const deleteSelectedNode = () => {
    if (!selectedId) return
    setNodes((current) => current.filter((n) => n.id !== selectedId))
    setEdges((current) => current.filter((e) => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
  }

  const styleNodes = nodes.map((n) => ({
    ...n,
    className: `${n.className ?? ''} design-node`,
    data: { ...n.data, label: n.data.label },
  }))

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Layers3 size={17} /></div><div><div className="brand-title">System Design Studio</div><div className="brand-subtitle">Interactive architecture workspace</div></div></div>
        <div className="topbar-center"><button className="file-title-button" onClick={() => { setLeftTab('files'); setFileName(activeFile?.name ?? '') }}>{activeFile?.name}<ChevronDown size={14} /></button><span className="saved-dot">Saved locally</span></div>
        <div className="top-actions">
          <button className="icon-btn" title="Export workspace" onClick={exportWorkspace}><Download size={16} /></button>
          <label className="icon-btn" title="Import workspace"><Upload size={16} /><input hidden type="file" accept="application/json" onChange={importWorkspace} /></label>
          <button className="icon-btn" title="Settings"><Settings2 size={16} /></button>
          <button className="share-btn"><Share2 size={15} /> Share</button>
          <button className="avatar">KG</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar left">
          <div className="sidebar-tabs"><button className={leftTab === 'components' ? 'active' : ''} onClick={() => setLeftTab('components')}>Components</button><button className={leftTab === 'files' ? 'active' : ''} onClick={() => setLeftTab('files')}>Files</button></div>
          {leftTab === 'components' ? <>
            <div className="search-wrap"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search components" /></div>
            <div className="component-section"><div className="section-label">ARCHITECTURE</div>{filteredPalette.map((item) => <div key={item.type} draggable onDragStart={() => dragType.current = item.type} onClick={() => addNode(item.type)} className="palette-item"><div className="palette-icon" style={{ background: `${item.color}16`, color: item.color }}><item.icon size={15} /></div><span>{item.label}</span><GripVertical size={13} className="drag-handle" /></div>)}</div>
            <div className="hint-card"><Sparkles size={15} /><div><strong>Tip</strong><p>Drag components onto the canvas, then connect handles to model request flow.</p></div></div>
          </> : <>
            <div className="files-toolbar"><button className="new-file-btn" onClick={newFile}><Plus size={15} /> New file</button><button className="icon-btn small" onClick={() => setShowTemplates(true)} title="Templates"><FilePlus2 size={15} /></button></div>
            <div className="file-list">{files.map((f) => <button key={f.id} className={`file-item ${f.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(f.id)}><FileCode2 size={15} /><div><strong>{f.name}</strong><span>{new Date(f.updatedAt).toLocaleDateString()}</span></div><MoreHorizontal size={15} /></button>)}</div>
            <div className="file-actions"><button onClick={exportWorkspace}><Download size={15} /> Export workspace</button><label><Upload size={15} /> Import workspace<input hidden type="file" accept="application/json" onChange={importWorkspace} /></label></div>
          </>}
          <div className="sidebar-footer"><Github size={14} /><span>System Design</span><span className="version">v0.1</span></div>
        </aside>

        <main className="canvas-area">
          <div className="canvas-header"><div><span className="breadcrumb">Workspace / {activeFile?.name}</span><h1>{activeFile?.name}</h1></div><div className="canvas-header-actions"><button onClick={() => setShowTemplates(true)}><Sparkles size={14} /> Templates</button><button onClick={() => setShowNotes((v) => !v)}><StickyNote size={14} /> Notes</button><button onClick={deleteActive} className="danger-ghost"><Trash2 size={14} /> Delete file</button></div></div>
          <div className="canvas-shell" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
            <ReactFlow
              nodes={styleNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlow}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              colorMode="dark"
            >
              <MiniMap className="minimap" pannable zoomable nodeColor={(n) => n.data?.color || '#64748b'} />
              <Controls className="flow-controls" />
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#233046" />
            </ReactFlow>
            <div className="canvas-toolbar"><div className="toolbar-pill"><Code2 size={14} /> Interview mode</div><div className="toolbar-pill"><Save size={14} /> Auto-save</div><div className="toolbar-pill"><Box size={14} /> {nodes.length} components</div></div>
          </div>
          {showNotes && <section className="notes-drawer"><div className="notes-head"><div><div className="section-label">PROBLEM & NOTES</div><strong>Interview workspace</strong></div><button onClick={() => setShowNotes(false)} className="icon-btn small"><X size={14} /></button></div><div className="notes-grid"><div><label>Prompt</label><textarea value={activeFile?.problem ?? ''} onChange={(e) => updateActive({ problem: e.target.value })} placeholder="Paste the interview problem statement…" /></div><div><label>Notes</label><textarea className="mono" value={activeFile?.notes ?? ''} onChange={(e) => updateActive({ notes: e.target.value })} placeholder="Write requirements, APIs, estimates, trade-offs, failure modes…" /></div></div></section>}
        </main>

        <aside className="sidebar right">
          <div className="inspector-head"><div><div className="section-label">INSPECTOR</div><h2>{selectedNode ? selectedNode.data.label : 'Canvas'}</h2></div>{selectedNode && <button className="icon-btn small" onClick={deleteSelectedNode}><Trash2 size={14} /></button>}</div>
          {selectedNode ? <div className="inspector-body">
            <div className="property"><label>Component name</label><input value={selectedNode.data.label} onChange={(e) => updateSelectedNode({ label: e.target.value })} /></div>
            <div className="property"><label>Type</label><div className="readonly"><Layers3 size={13} /> {selectedNode.data.type}</div></div>
            <div className="property"><label>Technology</label><input value={selectedNode.data.technology ?? ''} onChange={(e) => updateSelectedNode({ technology: e.target.value })} /></div>
            <div className="property"><label>Description</label><textarea value={selectedNode.data.description ?? ''} onChange={(e) => updateSelectedNode({ description: e.target.value })} /></div>
            <div className="inspector-section"><div className="section-row"><span>Position</span><span className="muted">{Math.round(selectedNode.position.x)} × {Math.round(selectedNode.position.y)}</span></div><div className="section-row"><span>Connections</span><span className="muted">{edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length}</span></div></div>
            <button className="delete-component" onClick={deleteSelectedNode}><Trash2 size={14} /> Remove component</button>
          </div> : <div className="empty-inspector"><div className="empty-icon"><Network size={20} /></div><strong>Select a component</strong><p>Click an architecture node to edit its name, technology, description, and inspect connections.</p></div>}
          <div className="right-bottom"><div className="section-label">DESIGN CHECKLIST</div><Checklist label="Requirements captured" done={Boolean(activeFile?.problem)} /><Checklist label="Core request flow" done={nodes.length > 0 && edges.length > 0} /><Checklist label="Data storage" done={nodes.some((n) => n.data.type === 'database')} /><Checklist label="Async boundaries" done={nodes.some((n) => n.data.type === 'queue')} /><Checklist label="Caching strategy" done={nodes.some((n) => n.data.type === 'cache')} /></div>
        </aside>
      </div>

      {showTemplates && <div className="modal-backdrop" onMouseDown={() => setShowTemplates(false)}><div className="template-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><div className="section-label">STARTER TEMPLATES</div><h2>Jump into a system</h2></div><button className="icon-btn" onClick={() => setShowTemplates(false)}><X size={16} /></button></div><div className="template-grid">{Object.entries(starterTemplates).map(([key, tpl]) => <button key={key} className="template-card" onClick={() => addTemplate(key as keyof typeof starterTemplates)}><div className="template-visual"><Layers3 size={22} /><span>{tpl.title}</span></div><h3>{tpl.title}</h3><p>{tpl.problem}</p><span className="template-link">Use template <ChevronRight size={14} /></span></button>)}</div></div></div>}

      {leftTab === 'files' && fileName !== '' && <div className="rename-popover"><label>File name<input autoFocus value={fileName} onChange={(e) => setFileName(e.target.value)} onBlur={() => { updateActive({ name: fileName.trim() || activeFile.name }); setFileName('') }} onKeyDown={(e) => { if (e.key === 'Enter') { updateActive({ name: fileName.trim() || activeFile.name }); setFileName('') } }} /></label></div>}
    </div>
  )
}

function Checklist({ label, done }: { label: string; done: boolean }) {
  return <div className="check-item"><span className={done ? 'check done' : 'check'}>{done ? '✓' : ''}</span><span>{label}</span></div>
}
