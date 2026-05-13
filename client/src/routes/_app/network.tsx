import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Network as NetworkIcon,
  User,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, mapUserResource } from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'

export const Route = createFileRoute('/_app/network')({
  component: NetworkPage,
})

/** Respuesta JSON de `GET /referral_networks/my_network` o `tree` */
type ReferralTreeUser = {
  id: number
  name: string
  role: string
  active: boolean
}

type ReferralTreeEdge = {
  referrer_id: number
  referred_id: number
  depth: number
  referred: ReferralTreeUser | null
}

type ReferralTreePayload = {
  root: ReferralTreeUser | null
  edges: ReferralTreeEdge[]
}

interface ConsultantNode {
  id: string
  name: string
  role: string
  active: boolean
  connections: string[]
  treeDepth: number
  x?: number
  y?: number
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return '?'
}

type UserStub = {
  id: number
  name: string
  role: string
  active: boolean
  treeDepth: number
}

/** Construye nodos y adyacencia a partir del árbol del backend (sin datos inventados). */
function buildConsultantNodes(payload: ReferralTreePayload): ConsultantNode[] {
  const byId = new Map<string, UserStub>()

  const upsertFull = (u: ReferralTreeUser, depth: number) => {
    const key = String(u.id)
    const prev = byId.get(key)
    const treeDepth = prev ? Math.min(prev.treeDepth, depth) : depth
    byId.set(key, {
      id: u.id,
      name: u.name || prev?.name || '',
      role: u.role || prev?.role || '',
      active: typeof u.active === 'boolean' ? u.active : (prev?.active ?? true),
      treeDepth,
    })
  }

  const touchId = (id: number, depth: number) => {
    const key = String(id)
    const prev = byId.get(key)
    const treeDepth = prev ? Math.min(prev.treeDepth, depth) : depth
    byId.set(key, {
      id,
      name: prev?.name ?? '',
      role: prev?.role ?? '',
      active: prev?.active ?? true,
      treeDepth,
    })
  }

  if (payload.root) upsertFull(payload.root, 0)

  const adjacency = new Map<string, Set<string>>()
  const addConn = (a: string, b: string) => {
    if (a === b) return
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    if (!adjacency.has(b)) adjacency.set(b, new Set())
    adjacency.get(a)!.add(b)
    adjacency.get(b)!.add(a)
  }

  for (const edge of payload.edges) {
    addConn(String(edge.referrer_id), String(edge.referred_id))
    if (edge.referred) upsertFull(edge.referred, edge.depth)
    else touchId(edge.referred_id, edge.depth)
    touchId(edge.referrer_id, Math.max(0, edge.depth - 1))
  }

  const ids = new Set<string>()
  if (payload.root) ids.add(String(payload.root.id))
  for (const e of payload.edges) {
    ids.add(String(e.referrer_id))
    ids.add(String(e.referred_id))
  }

  const nodes: ConsultantNode[] = []
  for (const idStr of ids) {
    const stub = byId.get(idStr)
    const root = payload.root
    const resolved =
      stub ||
      (root && String(root.id) === idStr
        ? {
            id: root.id,
            name: root.name,
            role: root.role,
            active: root.active,
            treeDepth: 0,
          }
        : {
            id: Number(idStr),
            name: '',
            role: '',
            active: true,
            treeDepth: 0,
          })
    nodes.push({
      id: idStr,
      name: resolved.name,
      role: resolved.role,
      active: resolved.active,
      treeDepth: resolved.treeDepth,
      connections: Array.from(adjacency.get(idStr) ?? []),
    })
  }

  return nodes.sort((a, b) => a.treeDepth - b.treeDepth || a.name.localeCompare(b.name))
}

/** Posiciones por niveles concéntricos (profundidad = distancia desde la raíz en el modelo API). */
function layoutNodes(nodes: ConsultantNode[]): ConsultantNode[] {
  const byDepth = new Map<number, ConsultantNode[]>()
  for (const n of nodes) {
    const d = n.treeDepth
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(n)
  }
  const depths = [...byDepth.keys()].sort((a, b) => a - b)
  const cx = 400
  const cy = 280

  for (const d of depths) {
    const ring = byDepth.get(d)!
    const radius = d === 0 ? 0 : 70 + (d - 1) * 95
    ring.forEach((node, i) => {
      const n = ring.length
      const angleStart = -Math.PI / 2
      const angle =
        n === 1 && d === 0 ? angleStart : angleStart + (i / Math.max(n, 1)) * 2 * Math.PI
      node.x = cx + radius * Math.cos(angle)
      node.y = cy + radius * Math.sin(angle)
    })
  }
  return nodes
}

function NetworkPage() {
  const currentUser = useAuthStore((s) => s.user)
  const canPickRoot = currentUser?.role === 'admin' || currentUser?.role === 'manager'

  const [searchTerm, setSearchTerm] = useState('')
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<ConsultantNode | null>(null)
  /** `null`: raíz del usuario actual (`my_network`). Otro valor: `/tree?root_user_id=` */
  const [rootUserId, setRootUserId] = useState<string | null>(null)
  /** Profundidad enviada al backend en `tree` (my_network usa 5 fijo en servidor). */
  const [treeDepth, setTreeDepth] = useState(5)

  const {
    data: staffUsers,
    isLoading: usersLoadingForPicker,
    isError: usersPickerError,
  } = useQuery({
    enabled: !!canPickRoot,
    queryKey: queryKeys.users.list({ q: '', forReferralPicker: true }),
    queryFn: async () => {
      const response = await api.get('/users', { params: { items: 500 } })
      return jsonApiPrimaryList(response.data)
        .filter((r) => r.id)
        .map(mapUserResource)
    },
  })

  const {
    data: treePayload,
    isLoading: treeLoading,
    isError: treeError,
    error: treeQueryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.referralNetworks.tree(rootUserId, treeDepth),
    queryFn: async (): Promise<ReferralTreePayload> => {
      if (rootUserId) {
        const response = await api.get('/referral_networks/tree', {
          params: { root_user_id: rootUserId, depth: treeDepth },
        })
        const data = response.data?.data as ReferralTreePayload | undefined
        if (!data) throw new Error('Respuesta sin datos de red')
        return data
      }
      const response = await api.get('/referral_networks/my_network')
      const data = response.data?.data as ReferralTreePayload | undefined
      if (!data) throw new Error('Respuesta sin datos de red')
      return data
    },
  })

  const graphNodes = useMemo(() => {
    if (!treePayload) return [] as ConsultantNode[]
    const hasEdges = (treePayload.edges?.length ?? 0) > 0
    if (!treePayload.root && !hasEdges) return [] as ConsultantNode[]
    return layoutNodes(buildConsultantNodes(treePayload))
  }, [treePayload])

  const filteredNodes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return graphNodes
    return graphNodes.filter(
      (node) =>
        node.name.toLowerCase().includes(q) ||
        node.role.toLowerCase().includes(q) ||
        node.id.includes(q),
    )
  }, [graphNodes, searchTerm])

  const stats = useMemo(() => {
    const n = graphNodes.length
    const e = Math.round(
      graphNodes.reduce((acc, node) => acc + node.connections.length, 0) / 2,
    )
    const maxDepth = graphNodes.reduce((m, node) => Math.max(m, node.treeDepth), 0)
    return { consultants: n, links: e, maxDepth }
  }, [graphNodes])

  useEffect(() => {
    if (!treeError || !treeQueryError) return
    toast.error(formatRailsError(treeQueryError, 'No se pudo cargar la red de referidos'))
  }, [treeError, treeQueryError])

  const isLoading = treeLoading || (canPickRoot && usersLoadingForPicker)

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Red de referidos"
        description="Árbol de consultores enlazados por referencias del tenant (datos desde el API)."
      />

      {canPickRoot && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[220px]">
            <label className="text-sm font-medium">Raíz del árbol</label>
            <Select
              value={rootUserId ?? '__me__'}
              onValueChange={(v) => {
                setRootUserId(v === '__me__' ? null : v)
                setSelectedNode(null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario raíz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__me__">
                  Mi red ({currentUser?.name ?? currentUser?.email ?? 'usuario actual'})
                </SelectItem>
                {staffUsers
                  ?.filter((u) => u.name || u.email || u.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email || `Usuario ${u.id}`}
                      {u.role ? ` · ${u.role}` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Profundidad (solo vista por árbol)</label>
            <Select
              value={String(treeDepth)}
              onValueChange={(v) => {
                setTreeDepth(Number(v))
                setSelectedNode(null)
              }}
              disabled={!rootUserId}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 5, 7, 10].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!rootUserId && (
              <p className="text-xs text-muted-foreground">
                Para &quot;Mi red&quot;, el servidor usa profundidad 5.
              </p>
            )}
          </div>
        </div>
      )}
      {canPickRoot && usersPickerError && (
        <p className="text-sm text-muted-foreground">
          No se pudo cargar la lista de usuarios para cambiar la raíz. Puedes seguir usando &quot;Mi red&quot;.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.consultants}</p>
                <p className="text-xs text-muted-foreground">Consultores en el árbol</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <NetworkIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.links}</p>
                <p className="text-xs text-muted-foreground">Relaciones referrer → referido</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Maximize2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.maxDepth}</p>
                <p className="text-xs text-muted-foreground">Nivel máximo desde la raíz</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, rol o ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Actualizar
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : treeError ? (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="text-sm text-destructive">
                  {formatRailsError(treeQueryError, 'Error al cargar la red')}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : graphNodes.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center p-6 text-center text-muted-foreground text-sm">
                No hay referidos registrados bajo esta raíz. Cuando existan relaciones en el tenant, aparecerán aquí.
              </div>
            ) : (
              <div className="relative h-[520px] overflow-hidden bg-muted/30">
                <svg
                  className="w-full h-full select-none"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                  viewBox="0 0 800 560"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Aristas */}
                  {filteredNodes.map((node) =>
                    node.connections.map((connId) => {
                      const other = graphNodes.find((n) => n.id === connId)
                      if (!other || node.id >= connId) return null
                      if (!filteredNodes.includes(other)) return null
                      return (
                        <line
                          key={`${node.id}-${connId}`}
                          x1={node.x}
                          y1={node.y}
                          x2={other.x}
                          y2={other.y}
                          stroke="currentColor"
                          strokeOpacity={0.25}
                          strokeWidth={1.5}
                        />
                      )
                    }),
                  )}
                  {filteredNodes.map((node) => {
                    const r = node.treeDepth === 0 ? 22 : 16
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        className="cursor-pointer"
                        onClick={() => setSelectedNode(node)}
                      >
                        <circle
                          r={r}
                          className={cn(
                            node.active ? 'fill-primary/90' : 'fill-muted-foreground/50',
                            selectedNode?.id === node.id && 'stroke-2 stroke-foreground',
                          )}
                        />
                        <title>{[node.name, node.role ? `(${node.role})` : ''].filter(Boolean).join(' ')}</title>
                        <text
                          y={r + 14}
                          textAnchor="middle"
                          className="fill-foreground text-[11px]"
                        >
                          {(node.name || `ID ${node.id}`).length > 14
                            ? `${(node.name || node.id).slice(0, 14)}…`
                            : node.name || node.id}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                <div className="absolute bottom-4 left-4 flex gap-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary/90" />
                    <span className="text-xs">Activo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/50" />
                    <span className="text-xs">Inactivo</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{initialsFromName(selectedNode.name || selectedNode.id)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedNode.name || `Usuario ${selectedNode.id}`}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {selectedNode.role || 'sin rol'}
                    </Badge>{' '}
                    <Badge variant={selectedNode.active ? 'outline' : 'destructive'} className="text-xs">
                      {selectedNode.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Referidos enlazados ({selectedNode.connections.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedNode.connections.map((connId) => {
                      const other = graphNodes.find((n) => n.id === connId)
                      if (!other) return null
                      return (
                        <button
                          type="button"
                          key={connId}
                          className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-muted"
                          onClick={() => setSelectedNode(other)}
                        >
                          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm">{other.name || `Usuario ${other.id}`}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <NetworkIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mt-2">Selecciona un consultor en el gráfico</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  )
}
