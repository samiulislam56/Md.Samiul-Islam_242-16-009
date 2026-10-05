import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  Building2,
  DoorOpen,
  Languages,
  MapPinned,
  RotateCcw,
  Route,
  Shield,
  ShieldAlert,
  Upload,
} from 'lucide-react'
import './App.css'

type Language = 'en' | 'bn'
type NodeType = 'room' | 'junction' | 'exit'
type InteractionMode = 'select' | 'hazard'

type NodeRecord = {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
}

type EdgeRecord = {
  id: string
  from: string
  to: string
  cost: number
}

type InitialState = {
  blocked_nodes: string[]
  blocked_edges: string[]
  closed_exits: string[]
}

type BuildingData = {
  building: string
  nodes: NodeRecord[]
  edges: EdgeRecord[]
  initial_state: InitialState
}

type RouteStatus = 'idle' | 'route' | 'blocked-start' | 'no-route'

type RouteResult = {
  status: RouteStatus
  exitId: string | null
  totalCost: number | null
  nodeSequence: string[]
  message: string
}

const translations = {
  en: {
    title: 'Smart Escape',
    subtitle: 'Interactive Evacuation Route Simulator',
    import: 'Import',
    reset: 'Reset',
    selectMode: 'Select start',
    hazardMode: 'Hazard mode',
    routeResult: 'Route result',
    routeAvailable: 'Route available',
    noRoute: 'No route available',
    blockedStart: 'Starting location blocked',
    chooseStart: 'Select a starting location',
    datasetStatus: 'Dataset status',
    unvalidated: 'No valid dataset loaded',
    map: 'Map',
    status: 'Status',
    actions: 'Hazard controls',
    mapHint: 'Select a room or junction to choose the start. Use hazard mode to block corridors, rooms and exits.',
    invalidJson: 'Invalid JSON or schema. Please import a valid building.json.',
    openExit: 'Open exit',
    blocked: 'Blocked',
    closed: 'Closed',
    hallway: 'Corridor',
    routeLabel: 'Route',
    totalCost: 'Total cost',
    destination: 'Destination exit',
    totalMoves: 'Sequence',
    language: 'Language',
    english: 'English',
    bangla: 'বাংলা',
    ready: 'Ready',
    noStart: 'No start selected',
    invalidFile: 'File is invalid',
  },
  bn: {
    title: 'স্মার্ট এস্কেপ',
    subtitle: 'ইন্টারঅ্যাকটিভ ইভাকুয়েশন রুট সিমুলেটর',
    import: 'ইমপোর্ট',
    reset: 'রিসেট',
    selectMode: 'শুরু বাছাই',
    hazardMode: 'হাজার্ড মোড',
    routeResult: 'রুটের ফলাফল',
    routeAvailable: 'রুট পাওয়া গেছে',
    noRoute: 'কোনো রুট পাওয়া যায়নি',
    blockedStart: 'শুরুর অবস্থান ব্লক করা হয়েছে',
    chooseStart: 'একটি শুরুর অবস্থান নির্বাচন করুন',
    datasetStatus: 'ডাটাসেট অবস্থা',
    unvalidated: 'কোনো বৈধ ডেটা লোড হয়নি',
    map: 'মানচিত্র',
    status: 'অবস্থা',
    actions: 'হাজার্ড কন্ট্রোল',
    mapHint: 'শুরু নির্বাচন করতে একটি রুম বা জাংশন নির্বাচন করুন। হ্যাজার্ড মোডে জংশন, করিডর ও এক্সিট ব্লক/আনব্লক করুন।',
    invalidJson: 'অবৈধ JSON বা স্কিমা। দয়া করে বৈধ building.json ইমপোর্ট করুন।',
    openExit: 'খোলা এক্সিট',
    blocked: 'ব্লক করা',
    closed: 'বন্ধ',
    hallway: 'করিডর',
    routeLabel: 'রুট',
    totalCost: 'মোট খরচ',
    destination: 'গন্তব্য এক্সিট',
    totalMoves: 'সিকোয়েন্স',
    language: 'ভাষা',
    english: 'English',
    bangla: 'বাংলা',
    ready: 'তৈরি',
    noStart: 'শুরু নির্বাচন হয়নি',
    invalidFile: 'ফাইলটি অবৈধ',
  },
} as const

const sampleBuilding: BuildingData = {
  building: 'Smart Escape Demo',
  nodes: [
    { id: 'R1', label: 'R1', type: 'room', x: 20, y: 62 },
    { id: 'R2', label: 'R2', type: 'room', x: 80, y: 18 },
    { id: 'C1', label: 'C1', type: 'junction', x: 36, y: 50 },
    { id: 'C2', label: 'C2', type: 'junction', x: 48, y: 36 },
    { id: 'C3', label: 'C3', type: 'junction', x: 62, y: 46 },
    { id: 'C4', label: 'C4', type: 'junction', x: 76, y: 36 },
    { id: 'E1', label: 'E1', type: 'exit', x: 58, y: 18 },
    { id: 'E2', label: 'E2', type: 'exit', x: 88, y: 56 },
  ],
  edges: [
    { id: 'e1', from: 'R1', to: 'C1', cost: 1 },
    { id: 'e2', from: 'C1', to: 'C2', cost: 2 },
    { id: 'e3', from: 'C2', to: 'E1', cost: 4 },
    { id: 'e4', from: 'C1', to: 'C3', cost: 4 },
    { id: 'e5', from: 'C3', to: 'C4', cost: 1 },
    { id: 'e6', from: 'C4', to: 'E2', cost: 5 },
    { id: 'e7', from: 'R2', to: 'C3', cost: 1 },
  ],
  initial_state: {
    blocked_nodes: [],
    blocked_edges: [],
    closed_exits: [],
  },
}

function toSet(values: string[] = []): Set<string> {
  return new Set(values)
}

function compareSequences(a: string[], b: string[]): number {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] === b[index]) continue
    return a[index].localeCompare(b[index])
  }
  return a.length - b.length
}

function validateBuildingData(data: unknown): { valid: true; value: BuildingData } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dataset is not a valid object.' }
  }

  const candidate = data as Record<string, unknown>
  if (typeof candidate.building !== 'string' || candidate.building.trim() === '') {
    return { valid: false, error: 'Field "building" must be a non-empty string.' }
  }

  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges) || !candidate.initial_state || typeof candidate.initial_state !== 'object') {
    return { valid: false, error: 'Dataset must contain nodes, edges and initial_state arrays.' }
  }

  const nodes = candidate.nodes as Record<string, unknown>[]
  const edges = candidate.edges as Record<string, unknown>[]
  const initialState = candidate.initial_state as Record<string, unknown>

  const seenNodeIds = new Set<string>()
  const nodeMap = new Map<string, NodeRecord>()

  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      return { valid: false, error: 'Each node entry must be an object.' }
    }

    const id = String(node.id ?? '').trim()
    const label = String(node.label ?? '').trim()
    const type = node.type
    const x = Number(node.x)
    const y = Number(node.y)

    if (!id || seenNodeIds.has(id)) {
      return { valid: false, error: 'Node IDs must be unique and non-empty.' }
    }
    if (!['room', 'junction', 'exit'].includes(String(type))) {
      return { valid: false, error: `Node ${id} must use a valid type: room, junction or exit.` }
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { valid: false, error: `Node ${id} must have numeric x and y coordinates.` }
    }

    const record: NodeRecord = {
      id,
      label: label || id,
      type: String(type) as NodeType,
      x,
      y,
    }
    seenNodeIds.add(id)
    nodeMap.set(id, record)
  }

  const hasRoomOrJunction = [...nodeMap.values()].some((node) => node.type !== 'exit')
  const hasExit = [...nodeMap.values()].some((node) => node.type === 'exit')
  if (!hasRoomOrJunction || !hasExit) {
    return { valid: false, error: 'Dataset must include at least one room or junction and at least one exit.' }
  }

  const seenEdgeIds = new Set<string>()
  for (const edge of edges) {
    if (!edge || typeof edge !== 'object') {
      return { valid: false, error: 'Each edge entry must be an object.' }
    }

    const id = String(edge.id ?? '').trim()
    const from = String(edge.from ?? '').trim()
    const to = String(edge.to ?? '').trim()
    const cost = Number(edge.cost)

    if (!id || seenEdgeIds.has(id)) {
      return { valid: false, error: 'Edge IDs must be unique and non-empty.' }
    }
    if (!nodeMap.has(from) || !nodeMap.has(to)) {
      return { valid: false, error: `Edge ${id} refers to missing node IDs.` }
    }
    if (from === to) {
      return { valid: false, error: `Edge ${id} cannot be a self-loop.` }
    }
    if (!Number.isInteger(cost) || cost <= 0) {
      return { valid: false, error: `Edge ${id} cost must be a positive integer.` }
    }

    seenEdgeIds.add(id)

    const pair = [from, to].sort()
    const repeatedPairs = edges.filter((candidate) => {
      const candidateFrom = String((candidate as Record<string, unknown>).from ?? '').trim()
      const candidateTo = String((candidate as Record<string, unknown>).to ?? '').trim()
      return [candidateFrom, candidateTo].sort().join('|') === pair.join('|')
    })

    if (repeatedPairs.length > 1) {
      return { valid: false, error: `Edge ${id} duplicates an existing node pair.` }
    }
  }

  const blockedNodes = Array.isArray(initialState.blocked_nodes) ? initialState.blocked_nodes : []
  const blockedEdges = Array.isArray(initialState.blocked_edges) ? initialState.blocked_edges : []
  const closedExits = Array.isArray(initialState.closed_exits) ? initialState.closed_exits : []

  for (const value of blockedNodes as unknown[]) {
    const id = String(value)
    if (!nodeMap.has(id) || nodeMap.get(id)?.type === 'exit') {
      return { valid: false, error: 'blocked_nodes must reference rooms or junctions only.' }
    }
  }

  for (const value of blockedEdges as unknown[]) {
    const id = String(value)
    const edgeExists = edges.some((entry) => String((entry as Record<string, unknown>).id ?? '') === id)
    if (!edgeExists) {
      return { valid: false, error: 'blocked_edges must reference valid edge IDs.' }
    }
  }

  for (const value of closedExits as unknown[]) {
    const id = String(value)
    if (!nodeMap.has(id) || nodeMap.get(id)?.type !== 'exit') {
      return { valid: false, error: 'closed_exits must reference exit nodes only.' }
    }
  }

  return {
    valid: true,
    value: {
      building: String(candidate.building),
      nodes: nodes.map((node) => ({
        id: String(node.id),
        label: String(node.label || node.id),
        type: String(node.type) as NodeType,
        x: Number(node.x),
        y: Number(node.y),
      })),
      edges: edges.map((edge) => ({
        id: String(edge.id),
        from: String(edge.from),
        to: String(edge.to),
        cost: Number(edge.cost),
      })),
      initial_state: {
        blocked_nodes: blockedNodes.map(String),
        blocked_edges: blockedEdges.map(String),
        closed_exits: closedExits.map(String),
      },
    },
  }
}

function buildActiveRoute(
  building: BuildingData,
  startId: string | null,
  blockedNodes: string[],
  blockedEdges: string[],
  closedExits: string[],
): RouteResult {
  if (!startId) {
    return { status: 'idle', exitId: null, totalCost: null, nodeSequence: [], message: 'Select a starting location' }
  }

  const nodeMap = new Map(building.nodes.map((node) => [node.id, node]))
  const startNode = nodeMap.get(startId)
  if (!startNode || startNode.type === 'exit' || blockedNodes.includes(startId)) {
    return {
      status: 'blocked-start',
      exitId: null,
      totalCost: null,
      nodeSequence: [startId],
      message: 'Starting location blocked',
    }
  }

  const blockedNodeSet = toSet(blockedNodes)
  const blockedEdgeSet = toSet(blockedEdges)
  const closedExitSet = toSet(closedExits)

  const adjacency = new Map<string, { to: string; cost: number; edgeId: string }[]>()

  for (const node of building.nodes) {
    adjacency.set(node.id, [])
  }

  for (const edge of building.edges) {
    if (blockedEdgeSet.has(edge.id)) continue
    if (blockedNodeSet.has(edge.from) || blockedNodeSet.has(edge.to)) continue
    if (closedExitSet.has(edge.from) || closedExitSet.has(edge.to)) continue

    adjacency.get(edge.from)?.push({ to: edge.to, cost: edge.cost, edgeId: edge.id })
    adjacency.get(edge.to)?.push({ to: edge.from, cost: edge.cost, edgeId: edge.id })
  }

  const bestByNode = new Map<string, { cost: number; path: string[] }>([[startId, { cost: 0, path: [startId] }]])
  const queue: Array<{ nodeId: string; cost: number; path: string[] }> = [{ nodeId: startId, cost: 0, path: [startId] }]

  while (queue.length > 0) {
    queue.sort((left, right) => left.cost - right.cost || compareSequences(left.path, right.path))
    const current = queue.shift()
    if (!current) break

    const bestKnown = bestByNode.get(current.nodeId)
    if (!bestKnown || current.cost !== bestKnown.cost || compareSequences(current.path, bestKnown.path) !== 0) {
      continue
    }

    for (const next of adjacency.get(current.nodeId) ?? []) {
      const nextNodeId = next.to
      const nextCost = current.cost + next.cost
      const nextPath = [...current.path, nextNodeId]
      const known = bestByNode.get(nextNodeId)

      if (!known || nextCost < known.cost || (nextCost === known.cost && compareSequences(nextPath, known.path) < 0)) {
        bestByNode.set(nextNodeId, { cost: nextCost, path: nextPath })
        queue.push({ nodeId: nextNodeId, cost: nextCost, path: nextPath })
      }
    }
  }

  const validExitIds = building.nodes
    .filter((node) => node.type === 'exit' && !closedExitSet.has(node.id))
    .map((node) => node.id)

  let bestWinner: { exitId: string; cost: number; path: string[] } | null = null

  for (const exitId of validExitIds) {
    const candidate = bestByNode.get(exitId)
    if (!candidate) continue

    if (
      !bestWinner ||
      candidate.cost < bestWinner.cost ||
      (candidate.cost === bestWinner.cost && (exitId.localeCompare(bestWinner.exitId) < 0 || (exitId === bestWinner.exitId && compareSequences(candidate.path, bestWinner.path) < 0)))
    ) {
      bestWinner = { exitId, cost: candidate.cost, path: candidate.path }
    }
  }

  if (!bestWinner) {
    return {
      status: 'no-route',
      exitId: null,
      totalCost: null,
      nodeSequence: [],
      message: 'No route available',
    }
  }

  return {
    status: 'route',
    exitId: bestWinner.exitId,
    totalCost: bestWinner.cost,
    nodeSequence: bestWinner.path,
    message: 'Route available',
  }
}

function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select')
  const [building, setBuilding] = useState<BuildingData | null>(null)
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null)
  const [blockedNodes, setBlockedNodes] = useState<string[]>([])
  const [blockedEdges, setBlockedEdges] = useState<string[]>([])
  const [closedExits, setClosedExits] = useState<string[]>([])
  const [validationError, setValidationError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const t = translations[language]

  const loadDataset = (data: BuildingData) => {
    setBuilding(data)
    setBlockedNodes([...data.initial_state.blocked_nodes])
    setBlockedEdges([...data.initial_state.blocked_edges])
    setClosedExits([...data.initial_state.closed_exits])
    setSelectedStartId(null)
    setValidationError('')
  }

  useEffect(() => {
    loadDataset(sampleBuilding)
  }, [])

  const routeResult = useMemo(() => {
    if (!building) {
      return { status: 'idle' as RouteStatus, exitId: null, totalCost: null, nodeSequence: [], message: t.chooseStart }
    }

    return buildActiveRoute(building, selectedStartId, blockedNodes, blockedEdges, closedExits)
  }, [building, selectedStartId, blockedNodes, blockedEdges, closedExits, t.chooseStart])

  const nodeMap = useMemo(() => new Map((building?.nodes ?? []).map((node) => [node.id, node])), [building])

  const routeEdgeSet = useMemo(() => {
    const set = new Set<string>()
    if (routeResult.nodeSequence.length < 2) return set

    for (let index = 0; index < routeResult.nodeSequence.length - 1; index += 1) {
      const from = routeResult.nodeSequence[index]
      const to = routeResult.nodeSequence[index + 1]
      const edge = building?.edges.find(
        (candidate) =>
          (candidate.from === from && candidate.to === to) || (candidate.from === to && candidate.to === from),
      )
      if (edge) set.add(edge.id)
    }
    return set
  }, [building, routeResult.nodeSequence])

  const mapBounds = useMemo(() => {
    if (!building) return null
    const values = building.nodes
    const minX = Math.min(...values.map((node) => node.x))
    const maxX = Math.max(...values.map((node) => node.x))
    const minY = Math.min(...values.map((node) => node.y))
    const maxY = Math.max(...values.map((node) => node.y))

    return { minX, maxX, minY, maxY }
  }, [building])

  const mapNodes = useMemo(() => {
    if (!building || !mapBounds) return []

    const padding = 64
    const width = 920
    const height = 540
    const rangeX = Math.max(mapBounds.maxX - mapBounds.minX, 1)
    const rangeY = Math.max(mapBounds.maxY - mapBounds.minY, 1)
    const scaleX = (width - padding * 2) / rangeX
    const scaleY = (height - padding * 2) / rangeY
    const scale = Math.min(scaleX, scaleY)

    return building.nodes.map((node) => {
      const x = padding + (node.x - mapBounds.minX) * scale
      const y = padding + (mapBounds.maxY - node.y) * scale
      return { ...node, x, y }
    })
  }, [building, mapBounds])

  const mapNodeMap = useMemo(() => new Map(mapNodes.map((node) => [node.id, node])), [mapNodes])

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? [])
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const validation = validateBuildingData(parsed)
      if (!validation.valid) {
        setValidationError(validation.error)
        return
      }
      setBuilding(validation.value)
      setBlockedNodes([...validation.value.initial_state.blocked_nodes])
      setBlockedEdges([...validation.value.initial_state.blocked_edges])
      setClosedExits([...validation.value.initial_state.closed_exits])
      setSelectedStartId(null)
      setValidationError('')
    } catch {
      setValidationError(t.invalidJson)
    } finally {
      event.target.value = ''
    }
  }

  const toggleBlockedNode = (nodeId: string) => {
    const target = nodeMap.get(nodeId)
    if (!target || target.type === 'exit') return

    setBlockedNodes((current) => {
      const next = current.includes(nodeId) ? current.filter((value) => value !== nodeId) : [...current, nodeId]
      return next
    })
  }

  const toggleBlockedEdge = (edgeId: string) => {
    setBlockedEdges((current) =>
      current.includes(edgeId) ? current.filter((value) => value !== edgeId) : [...current, edgeId],
    )
  }

  const toggleExitClosed = (nodeId: string) => {
    const target = nodeMap.get(nodeId)
    if (!target || target.type !== 'exit') return

    setClosedExits((current) => (current.includes(nodeId) ? current.filter((value) => value !== nodeId) : [...current, nodeId]))
  }

  const handleMapAction = (nodeId: string) => {
    if (!building) return

    const node = nodeMap.get(nodeId)
    if (!node) return

    if (interactionMode === 'select') {
      if (node.type !== 'room' && node.type !== 'junction') return
      if (blockedNodes.includes(nodeId)) return
      setSelectedStartId(nodeId)
      return
    }

    if (node.type === 'exit') {
      toggleExitClosed(nodeId)
      return
    }

    toggleBlockedNode(nodeId)
  }

  const handleEdgeAction = (edgeId: string) => {
    if (interactionMode === 'select') return
    toggleBlockedEdge(edgeId)
  }

  const resetSimulation = () => {
    if (!building) return
    setBlockedNodes([...building.initial_state.blocked_nodes])
    setBlockedEdges([...building.initial_state.blocked_edges])
    setClosedExits([...building.initial_state.closed_exits])
  }

  const statusTone = routeResult.status === 'route' ? 'good' : routeResult.status === 'blocked-start' ? 'warning' : routeResult.status === 'no-route' ? 'danger' : 'neutral'
  const localizedStatusMessage =
    routeResult.status === 'route'
      ? t.routeAvailable
      : routeResult.status === 'blocked-start'
        ? t.blockedStart
        : routeResult.status === 'no-route'
          ? t.noRoute
          : t.chooseStart

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{t.datasetStatus}</p>
          <h1>{building?.building ?? t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>

        <div className="toolbar">
          <div className="toolbar-group language-group">
            <Languages size={16} />
            <span>{t.language}</span>
            <button
              type="button"
              className={language === 'en' ? 'active' : ''}
              onClick={() => setLanguage('en')}
            >
              {t.english}
            </button>
            <button
              type="button"
              className={language === 'bn' ? 'active' : ''}
              onClick={() => setLanguage('bn')}
            >
              {t.bangla}
            </button>
          </div>

          <button type="button" className="primary-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            {t.import}
          </button>

          <button type="button" className="secondary-btn" onClick={resetSimulation}>
            <RotateCcw size={16} />
            {t.reset}
          </button>

          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar left-panel">
          <div className="panel-block">
            <div className="panel-heading">
              <MapPinned size={18} />
              {t.map}
            </div>
            <div className="toggle-row">
              <button type="button" className={interactionMode === 'select' ? 'toggle active' : 'toggle'} onClick={() => setInteractionMode('select')}>
                {t.selectMode}
              </button>
              <button type="button" className={interactionMode === 'hazard' ? 'toggle active' : 'toggle'} onClick={() => setInteractionMode('hazard')}>
                {t.hazardMode}
              </button>
            </div>
            <p className="helper-text">{t.mapHint}</p>
          </div>

          <div className="panel-block">
            <div className="panel-heading">
              <Building2 size={18} />
              {t.actions}
            </div>
            <div className="state-list">
              <div className="list-item">
                <span className="dot blue"></span>
                <span>{t.openExit}</span>
              </div>
              <div className="list-item">
                <span className="dot warning"></span>
                <span>{t.blocked}</span>
              </div>
              <div className="list-item">
                <span className="dot danger"></span>
                <span>{t.closed}</span>
              </div>
            </div>
          </div>

          <div className="panel-block">
            <div className="panel-heading">
              <Shield size={18} />
              {t.status}
            </div>
            <div className={`status-box ${statusTone}`} aria-live="polite">
              <span>{localizedStatusMessage}</span>
            </div>
          </div>
        </aside>

        <section className="map-panel">
          <div className="map-header">
            <div className="map-title">
              <Route size={16} />
              {t.routeResult}
            </div>
            <div className="badge">
              {selectedStartId ? `Start: ${selectedStartId}` : t.noStart}
            </div>
          </div>

          {validationError ? (
            <div className="error-banner">
              <AlertTriangle size={18} />
              <span>{validationError}</span>
            </div>
          ) : null}

          {building ? (
            <svg className="map-svg" viewBox="0 0 920 540" role="img" aria-label="Building evacuation map">
              {building.edges.map((edge) => {
                const fromNode = mapNodeMap.get(edge.from)
                const toNode = mapNodeMap.get(edge.to)
                if (!fromNode || !toNode) return null

                const isBlocked = blockedEdges.includes(edge.id)
                const isOnRoute = routeEdgeSet.has(edge.id)
                const strokeColor = isOnRoute ? '#3ad9b1' : isBlocked ? '#f97316' : '#3b4753'
                const dash = isBlocked ? '12 8' : undefined

                return (
                  <g key={edge.id} onClick={() => handleEdgeAction(edge.id)} style={{ cursor: interactionMode === 'select' ? 'default' : 'pointer' }} role="button" tabIndex={0} onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && interactionMode !== 'select') {
                      event.preventDefault();
                      handleEdgeAction(edge.id)
                    }
                  }} aria-label={`${edge.id} corridor`}> 
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={strokeColor}
                      strokeWidth={isOnRoute ? 6 : isBlocked ? 3 : 3}
                      strokeDasharray={dash}
                      opacity={isBlocked ? 0.5 : 1}
                    />
                    <text x={(fromNode.x + toNode.x) / 2} y={(fromNode.y + toNode.y) / 2 - 12} className="edge-cost" textAnchor="middle">
                      {edge.cost}
                    </text>
                  </g>
                )
              })}

              {mapNodes.map((node) => {
                const blocked = blockedNodes.includes(node.id)
                const closed = node.type === 'exit' && closedExits.includes(node.id)
                const onRoute = routeResult.nodeSequence.includes(node.id)
                const isStart = selectedStartId === node.id
                const baseClass = node.type === 'exit' ? 'exit-node' : node.type === 'room' ? 'room-node' : 'junction-node'

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    onClick={() => handleMapAction(node.id)}
                    className={baseClass}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleMapAction(node.id)
                      }
                    }}
                    aria-label={`${node.label} ${node.type} ${blocked ? 'blocked' : closed ? 'closed' : 'open'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {node.type === 'room' ? (
                      <rect x={-18} y={-18} width={36} height={36} rx={8} className={blocked ? 'node-blocked' : isStart ? 'node-start' : closed ? 'node-closed' : onRoute ? 'node-route' : ''} />
                    ) : node.type === 'junction' ? (
                      <circle r={16} className={blocked ? 'node-blocked' : isStart ? 'node-start' : closed ? 'node-closed' : onRoute ? 'node-route' : ''} />
                    ) : (
                      <rect x={-20} y={-20} width={40} height={40} rx={10} className={closed ? 'node-closed' : isStart ? 'node-start' : onRoute ? 'node-route' : 'node-open'} />
                    )}

                    {blocked ? <path d="M -12 -12 L 12 12 M -12 12 L 12 -12" className="blocked-mark" /> : null}
                    {closed && node.type === 'exit' ? <text y={42} className="node-tag">{t.closed}</text> : null}
                    <text y={5} className="node-label" textAnchor="middle">{node.label}</text>
                  </g>
                )
              })}
            </svg>
          ) : (
            <div className="empty-state">
              <Building2 size={28} />
              <p>{t.unvalidated}</p>
            </div>
          )}
        </section>

        <aside className="sidebar right-panel">
          <div className="panel-block">
            <div className="panel-heading">
              <DoorOpen size={18} />
              {t.routeResult}
            </div>
            <div className="metric-card">
              <span>{t.status}</span>
              <strong>{routeResult.message}</strong>
            </div>
            <div className="metric-card">
              <span>{t.destination}</span>
              <strong>{routeResult.exitId ?? t.noRoute}</strong>
            </div>
            <div className="metric-card">
              <span>{t.totalCost}</span>
              <strong>{routeResult.totalCost !== null ? `${routeResult.totalCost}` : '—'}</strong>
            </div>
            <div className="metric-card">
              <span>{t.totalMoves}</span>
              <strong>{routeResult.nodeSequence.length > 0 ? routeResult.nodeSequence.join(' → ') : '—'}</strong>
            </div>
          </div>

          <div className="panel-block">
            <div className="panel-heading">
              <ShieldAlert size={18} />
              {t.ready}
            </div>
            <ul className="summary-list">
              <li>{t.routeLabel}: {routeResult.nodeSequence.length > 0 ? routeResult.nodeSequence.join(' → ') : '—'}</li>
              <li>{t.blocked}: {blockedNodes.length}</li>
              <li>{t.hallway}: {blockedEdges.length}</li>
              <li>{t.closed}: {closedExits.length}</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
