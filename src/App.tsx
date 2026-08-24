import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Position,
  ReactFlow, addEdge, useEdgesState, useNodesState,
  type Connection, type Edge, type Node
} from '@xyflow/react'
import {
  Box, ChevronDown, CircleDot, Cloud, Copy, Database, Download, FilePlus2,
  Globe2, GripVertical, HardDrive, Layers3, Link2, MessageSquareText, MoreHorizontal,
  MousePointer2, Network, Pencil, Plus, Redo2, Save, Search, Server, Square, StickyNote,
  Trash2, Type, Undo2, Upload, Workflow, X, Zap
} from 'lucide-react'
import '@xyflow/react/dist/style.css'

type Kind = 'client'|'service'|'gateway'|'load-balancer'|'database'|'cache'|'queue'|'storage'|'cdn'|'worker'|'external'|'box'|'group'|'text'|'note'
type DesignData = { label:string; kind:Kind; color:string; description?:string }
type DesignNode = Node<DesignData>
type ProjectFile = { id:string; name:string; updatedAt:number; nodes:DesignNode[]; edges:Edge[] }

const palette:{kind:Kind;label:string;icon:any;color:string}[] = [
  {kind:'client',label:'Client',icon:Globe2,color:'#60a5fa'},
  {kind:'service',label:'Service',icon:Server,color:'#8b5cf6'},
  {kind:'gateway',label:'API Gateway',icon:Network,color:'#f59e0b'},
  {kind:'load-balancer',label:'Load Balancer',icon:Workflow,color:'#22c55e'},
  {kind:'database',label:'Database',icon:Database,color:'#38bdf8'},
  {kind:'cache',label:'Cache',icon:Zap,color:'#fb923c'},
  {kind:'queue',label:'Queue',icon:MessageSquareText,color:'#ec4899'},
  {kind:'storage',label:'Object Storage',icon:HardDrive,color:'#14b8a6'},
  {kind:'cdn',label:'CDN',icon:Cloud,color:'#818cf8'},
  {kind:'worker',label:'Worker',icon:Workflow,color:'#a78bfa'},
  {kind:'external',label:'External API',icon:Link2,color:'#94a3b8'},
  {kind:'box',label:'Box',icon:Square,color:'#94a3b8'},
  {kind:'group',label:'Group',icon:Box,color:'#64748b'},
  {kind:'text',label:'Text',icon:Type,color:'#e2e8f0'},
  {kind:'note',label:'Sticky Note',icon:StickyNote,color:'#facc15'},
]

function makeNode(kind:Kind, position={x:220,y:180}):DesignNode {
  const p = palette.find(x=>x.kind===kind)!
  return {
    id: crypto.randomUUID(), type:'design', position,
    data:{label:p.label,kind,color:p.color,description:''},
    style:{width: kind==='group'?280:kind==='text'?180:kind==='note'?190:170}
  }
}
function blankFile(name='Untitled Design'):ProjectFile {
  return {id:crypto.randomUUID(),name,updatedAt:Date.now(),nodes:[],edges:[]}
}
const seed = blankFile('Untitled Design')

function DesignNodeView({data,selected}:{data:DesignData;selected:boolean}) {
  if(data.kind==='text') return <div className="text-node" style={{color:data.color}}>{data.label}</div>
  if(data.kind==='group') return <div className="group-node" style={{borderColor:data.color}}><div>{data.label}</div><Handle type="target" position={Position.Left}/><Handle type="source" position={Position.Right}/></div>
  if(data.kind==='note') return <div className="sticky-node"><Handle type="target" position={Position.Left}/><strong>{data.label}</strong><p>{data.description || 'Double click to add a note'}</p><Handle type="source" position={Position.Right}/></div>
  return <div className={'design-node-card '+(selected?'selected':'')} style={{'--accent':data.color} as React.CSSProperties}>
    <Handle type="target" position={Position.Left}/><div className="node-stripe"/><div className="node-title">{data.label}</div>{data.description&&<div className="node-description">{data.description}</div>}<Handle type="source" position={Position.Right}/>
  </div>
}
const nodeTypes={design:DesignNodeView}

export default function App(){
  const [files,setFiles]=useState<ProjectFile[]>(()=>{try{return JSON.parse(localStorage.getItem('sd-files')||'')||[seed]}catch{return [seed]}})
  const [activeId,setActiveId]=useState(()=>files[0]?.id||seed.id)
  const active=files.find(f=>f.id===activeId)||files[0]
  const [nodes,setNodes,onNodesChange]=useNodesState<DesignNode>(active.nodes)
  const [edges,setEdges,onEdgesChange]=useEdgesState(active.edges)
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [query,setQuery]=useState('')
  const [leftTab,setLeftTab]=useState<'components'|'files'>('components')
  const [flow,setFlow]=useState<any>(null)
  const dragKind=useRef<Kind|null>(null)
  const history=useRef<{nodes:DesignNode[];edges:Edge[]}[]>([])
  const future=useRef<{nodes:DesignNode[];edges:Edge[]}[]>([])
  const selected=nodes.find(n=>n.id===selectedId)

  useEffect(()=>{localStorage.setItem('sd-files',JSON.stringify(files))},[files])
  useEffect(()=>{setNodes(active.nodes);setEdges(active.edges);setSelectedId(null)},[activeId])
  useEffect(()=>{const t=setTimeout(()=>setFiles(prev=>prev.map(f=>f.id===activeId?{...f,nodes,edges,updatedAt:Date.now()}:f)),250);return()=>clearTimeout(t)},[nodes,edges,activeId])
  const snapshot=()=>{history.current.push({nodes:structuredClone(nodes),edges:structuredClone(edges)});history.current=history.current.slice(-40);future.current=[]}
  const onConnect=useCallback((c:Connection)=>{snapshot();setEdges(es=>addEdge({...c,type:'smoothstep',markerEnd:{type:MarkerType.ArrowClosed},style:{stroke:'#8190a5',strokeWidth:1.7}},es))},[edges,nodes])
  const undo=()=>{const prev=history.current.pop();if(!prev)return;future.current.push({nodes:structuredClone(nodes),edges:structuredClone(edges)});setNodes(prev.nodes);setEdges(prev.edges)}
  const redo=()=>{const next=future.current.pop();if(!next)return;history.current.push({nodes:structuredClone(nodes),edges:structuredClone(edges)});setNodes(next.nodes);setEdges(next.edges)}
  const addNode=(kind:Kind,pos={x:250,y:180})=>{snapshot();const n=makeNode(kind,pos);setNodes(ns=>[...ns,n]);setSelectedId(n.id)}
  const onDrop=(e:React.DragEvent)=>{e.preventDefault();if(!dragKind.current||!flow)return;addNode(dragKind.current,flow.screenToFlowPosition({x:e.clientX,y:e.clientY}));dragKind.current=null}
  const createFile=()=>{const f=blankFile('Untitled Design');setFiles(fs=>[f,...fs]);setActiveId(f.id);setLeftTab('files')}
  const renameActive=()=>{const name=prompt('Design name',active.name);if(name?.trim())setFiles(fs=>fs.map(f=>f.id===activeId?{...f,name:name.trim(),updatedAt:Date.now()}:f))}
  const duplicateActive=()=>{const f={...structuredClone(active),id:crypto.randomUUID(),name:active.name+' copy',updatedAt:Date.now(),nodes:active.nodes.map(n=>({...n,id:crypto.randomUUID()}))};setFiles(fs=>[f,...fs]);setActiveId(f.id)}
  const deleteActive=()=>{const remaining=files.filter(f=>f.id!==activeId);const next=remaining[0]||blankFile();setFiles(remaining.length?remaining:[next]);setActiveId(next.id)}
  const removeSelected=()=>{if(!selectedId)return;snapshot();setNodes(ns=>ns.filter(n=>n.id!==selectedId));setEdges(es=>es.filter(e=>e.source!==selectedId&&e.target!==selectedId));setSelectedId(null)}
  const updateSelected=(patch:Partial<DesignData>)=>{if(!selectedId)return;setNodes(ns=>ns.map(n=>n.id===selectedId?{...n,data:{...n.data,...patch}}:n))}
  const duplicateSelected=()=>{if(!selected)return;snapshot();const n={...structuredClone(selected),id:crypto.randomUUID(),position:{x:selected.position.x+35,y:selected.position.y+35}};setNodes(ns=>[...ns,n]);setSelectedId(n.id)}
  const exportWorkspace=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(files,null,2)],{type:'application/json'}));a.download='system-design-workspace.json';a.click()}
  const importWorkspace=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const v=JSON.parse(String(r.result));if(!Array.isArray(v)||!v.length)throw Error();setFiles(v);setActiveId(v[0].id)}catch{alert('Invalid workspace file')}};r.readAsText(f);e.target.value=''}
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='z'){e.preventDefault();undo()}if((e.metaKey||e.ctrlKey)&&e.key==='y'){e.preventDefault();redo()}if((e.metaKey||e.ctrlKey)&&e.key==='d'&&selected){e.preventDefault();duplicateSelected()}if((e.key==='Delete'||e.key==='Backspace')&&selected&&document.activeElement===document.body){e.preventDefault();removeSelected()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)})
  const visible=useMemo(()=>palette.filter(p=>p.label.toLowerCase().includes(query.toLowerCase())),[query])

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Layers3 size={17}/></div><div><b>System Design Studio</b><span>blank architecture workspace</span></div></div>
      <button className="design-name" onClick={renameActive}>{active.name}<ChevronDown size={14}/></button>
      <div className="top-actions"><button className="icon-btn" onClick={undo} title="Undo"><Undo2 size={16}/></button><button className="icon-btn" onClick={redo} title="Redo"><Redo2 size={16}/></button><button className="icon-btn" onClick={exportWorkspace}><Download size={16}/></button><label className="icon-btn"><Upload size={16}/><input hidden type="file" accept="application/json" onChange={importWorkspace}/></label><span className="saved"><Save size={13}/> Saved</span></div>
    </header>
    <div className="workspace">
      <aside className="sidebar left"><div className="sidebar-tabs"><button className={leftTab==='components'?'active':''} onClick={()=>setLeftTab('components')}>Components</button><button className={leftTab==='files'?'active':''} onClick={()=>setLeftTab('files')}>Files <span>{files.length}</span></button></div>
      {leftTab==='components'?<><div className="search-wrap"><Search size={14}/><input placeholder="Search components" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="palette"><div className="palette-label">SYSTEM COMPONENTS</div>{visible.map(p=><button key={p.kind} draggable onDragStart={()=>dragKind.current=p.kind} onClick={()=>addNode(p.kind)} className="palette-item"><i style={{color:p.color,background:p.color+'18'}}><p.icon size={15}/></i>{p.label}<GripVertical size={13}/></button>)}</div></>:<><div className="files-toolbar"><button className="new-file" onClick={createFile}><Plus size={15}/> New design</button></div><div className="file-list">{files.map(f=><div className={'file-row '+(f.id===activeId?'active':'')} key={f.id}><button onClick={()=>setActiveId(f.id)}><FilePlus2 size={14}/><span><b>{f.name}</b><small>{new Date(f.updatedAt).toLocaleDateString()}</small></span></button><button className="more" onClick={()=>setActiveId(f.id)}><MoreHorizontal size={15}/></button></div>)}</div></>}
      <div className="sidebar-tip"><MousePointer2 size={14}/><span>Drag, connect, zoom and build.</span></div></aside>
      <main className="canvas-area"><div className="canvas-header"><div><span>MY DESIGNS</span><h1>{active.name}</h1></div><div className="canvas-actions"><button onClick={createFile}><Plus size={14}/> New</button><button onClick={renameActive}><Pencil size={14}/> Rename</button><button onClick={duplicateActive}><Copy size={14}/> Duplicate</button><button className="danger" onClick={deleteActive}><Trash2 size={14}/></button></div></div>
        <div className="canvas-shell" onDrop={onDrop} onDragOver={e=>e.preventDefault()}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setFlow} onNodeClick={(_,n)=>setSelectedId(n.id)} onPaneClick={()=>setSelectedId(null)} colorMode="dark" fitView fitViewOptions={{padding:.3}}><Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#26344b"/><MiniMap pannable zoomable/><Controls/></ReactFlow><div className="canvas-status"><span><CircleDot size={12}/> {nodes.length} nodes</span><span><Link2 size={12}/> {edges.length} connections</span></div></div>
      </main>
      <aside className="sidebar right"><div className="inspector-head"><div><span>PROPERTIES</span><h2>{selected?selected.data.label:'Nothing selected'}</h2></div>{selected&&<button className="icon-btn small" onClick={removeSelected}><Trash2 size={14}/></button>}</div>
      {selected?<div className="inspector"><label>Name<input value={selected.data.label} onChange={e=>updateSelected({label:e.target.value})}/></label><label>Type<div className="readonly">{selected.data.kind}</div></label><label>Description<textarea value={selected.data.description||''} onChange={e=>updateSelected({description:e.target.value})} placeholder="Optional note about this component"/></label><div className="color-row"><span>Color</span><input type="color" value={selected.data.color} onChange={e=>updateSelected({color:e.target.value})}/></div><button className="duplicate" onClick={duplicateSelected}><Copy size={14}/> Duplicate component</button><button className="delete" onClick={removeSelected}><Trash2 size={14}/> Delete component</button></div>:<div className="empty"><div><Network size={22}/></div><b>Select something</b><p>Click a component to edit it. Double click node text directly if you want a quick rename.</p></div>}
      <div className="shortcuts"><span>SHORTCUTS</span><p><kbd>⌘/Ctrl Z</kbd> Undo</p><p><kbd>⌘/Ctrl Y</kbd> Redo</p><p><kbd>⌘/Ctrl D</kbd> Duplicate</p><p><kbd>Del</kbd> Remove</p></div></aside>
    </div>
  </div>
}
