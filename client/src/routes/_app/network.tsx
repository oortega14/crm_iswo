import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Filter,
  Network as NetworkIcon,
  Building2,
  User,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/network')({
  component: NetworkPage,
})

interface NetworkNode {
  id: string
  type: 'contact' | 'company' | 'opportunity'
  name: string
  email?: string
  industry?: string
  value?: number
  connections: string[]
  x?: number
  y?: number
}

function NetworkPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'contact' | 'company' | 'opportunity'>('all')
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [zoom, setZoom] = useState(1)

  const { data: networkData, isLoading } = useQuery({
    queryKey: ['network'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const nodes: NetworkNode[] = [
        // Companies
        { id: 'company-1', type: 'company', name: 'TechCorp', industry: 'Technology', connections: ['contact-1', 'contact-2', 'opp-1'] },
        { id: 'company-2', type: 'company', name: 'InnoSoft', industry: 'Software', connections: ['contact-3', 'opp-2'] },
        { id: 'company-3', type: 'company', name: 'DataSystems', industry: 'Data Analytics', connections: ['contact-4', 'contact-5'] },
        { id: 'company-4', type: 'company', name: 'CloudNet', industry: 'Cloud Services', connections: ['contact-6', 'opp-3'] },
        { id: 'company-5', type: 'company', name: 'DevPro', industry: 'Development', connections: ['contact-7'] },
        
        // Contacts
        { id: 'contact-1', type: 'contact', name: 'Juan Garcia', email: 'juan@techcorp.com', connections: ['company-1', 'opp-1'] },
        { id: 'contact-2', type: 'contact', name: 'Maria Lopez', email: 'maria@techcorp.com', connections: ['company-1'] },
        { id: 'contact-3', type: 'contact', name: 'Carlos Rodriguez', email: 'carlos@innosoft.com', connections: ['company-2', 'opp-2'] },
        { id: 'contact-4', type: 'contact', name: 'Ana Martinez', email: 'ana@datasystems.com', connections: ['company-3'] },
        { id: 'contact-5', type: 'contact', name: 'Pedro Gonzalez', email: 'pedro@datasystems.com', connections: ['company-3'] },
        { id: 'contact-6', type: 'contact', name: 'Sofia Hernandez', email: 'sofia@cloudnet.com', connections: ['company-4', 'opp-3'] },
        { id: 'contact-7', type: 'contact', name: 'Luis Sanchez', email: 'luis@devpro.com', connections: ['company-5'] },
        
        // Opportunities
        { id: 'opp-1', type: 'opportunity', name: 'Proyecto CRM', value: 50000, connections: ['company-1', 'contact-1'] },
        { id: 'opp-2', type: 'opportunity', name: 'Consultoria IT', value: 30000, connections: ['company-2', 'contact-3'] },
        { id: 'opp-3', type: 'opportunity', name: 'Migracion Cloud', value: 75000, connections: ['company-4', 'contact-6'] },
      ]

      // Calculate positions in a circular layout
      const centerX = 400
      const centerY = 300
      const companies = nodes.filter(n => n.type === 'company')
      const contacts = nodes.filter(n => n.type === 'contact')
      const opportunities = nodes.filter(n => n.type === 'opportunity')

      companies.forEach((node, i) => {
        const angle = (i / companies.length) * 2 * Math.PI
        node.x = centerX + Math.cos(angle) * 200
        node.y = centerY + Math.sin(angle) * 200
      })

      contacts.forEach((node, i) => {
        const angle = (i / contacts.length) * 2 * Math.PI + 0.3
        node.x = centerX + Math.cos(angle) * 120
        node.y = centerY + Math.sin(angle) * 120
      })

      opportunities.forEach((node, i) => {
        const angle = (i / opportunities.length) * 2 * Math.PI + 0.6
        node.x = centerX + Math.cos(angle) * 280
        node.y = centerY + Math.sin(angle) * 280
      })

      return nodes
    }
  })

  const filteredNodes = useMemo(() => {
    if (!networkData) return []
    
    return networkData.filter(node => {
      const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterType === 'all' || node.type === filterType
      return matchesSearch && matchesFilter
    })
  }, [networkData, searchTerm, filterType])

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'company': return 'bg-blue-500'
      case 'contact': return 'bg-green-500'
      case 'opportunity': return 'bg-amber-500'
      default: return 'bg-gray-500'
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'company': return Building2
      case 'contact': return User
      case 'opportunity': return LinkIcon
      default: return NetworkIcon
    }
  }

  const stats = useMemo(() => {
    if (!networkData) return { companies: 0, contacts: 0, opportunities: 0, connections: 0 }
    
    return {
      companies: networkData.filter(n => n.type === 'company').length,
      contacts: networkData.filter(n => n.type === 'contact').length,
      opportunities: networkData.filter(n => n.type === 'opportunity').length,
      connections: networkData.reduce((acc, n) => acc + n.connections.length, 0) / 2
    }
  }, [networkData])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Red de Contactos</h1>
          <p className="text-sm text-muted-foreground">
            Visualiza las conexiones entre contactos, empresas y oportunidades
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.companies}</p>
                <p className="text-xs text-muted-foreground">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.contacts}</p>
                <p className="text-xs text-muted-foreground">Contactos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <LinkIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.opportunities}</p>
                <p className="text-xs text-muted-foreground">Oportunidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <NetworkIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.connections}</p>
                <p className="text-xs text-muted-foreground">Conexiones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="company">Empresas</SelectItem>
              <SelectItem value="contact">Contactos</SelectItem>
              <SelectItem value="opportunity">Oportunidades</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Network Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Graph Area */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="relative h-[500px] overflow-hidden bg-muted/30">
                <svg 
                  className="w-full h-full"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                >
                  {/* Draw connections */}
                  {filteredNodes.map(node => 
                    node.connections.map(connId => {
                      const connNode = networkData?.find(n => n.id === connId)
                      if (!connNode || !filteredNodes.includes(connNode)) return null
                      if (node.id > connId) return null // Avoid duplicate lines
                      
                      return (
                        <line
                          key={`${node.id}-${connId}`}
                          x1={node.x}
                          y1={node.y}
                          x2={connNode.x}
                          y2={connNode.y}
                          stroke="currentColor"
                          strokeOpacity={0.2}
                          strokeWidth={1}
                        />
                      )
                    })
                  )}
                  
                  {/* Draw nodes */}
                  {filteredNodes.map(node => {
                    const Icon = getNodeIcon(node.type)
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        className="cursor-pointer"
                        onClick={() => setSelectedNode(node)}
                      >
                        <circle
                          r={node.type === 'company' ? 24 : node.type === 'opportunity' ? 20 : 16}
                          className={cn(
                            "transition-all",
                            node.type === 'company' ? 'fill-blue-500' : 
                            node.type === 'contact' ? 'fill-green-500' : 'fill-amber-500',
                            selectedNode?.id === node.id && 'stroke-2 stroke-foreground'
                          )}
                        />
                        <text
                          y={node.type === 'company' ? 40 : 32}
                          textAnchor="middle"
                          className="text-xs fill-foreground"
                          style={{ fontSize: '10px' }}
                        >
                          {node.name.length > 12 ? node.name.slice(0, 12) + '...' : node.name}
                        </text>
                      </g>
                    )
                  })}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 flex gap-4 bg-background/80 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-xs">Empresa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs">Contacto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-xs">Oportunidad</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg",
                    selectedNode.type === 'company' ? 'bg-blue-100' :
                    selectedNode.type === 'contact' ? 'bg-green-100' : 'bg-amber-100'
                  )}>
                    {(() => {
                      const Icon = getNodeIcon(selectedNode.type)
                      return <Icon className={cn(
                        "h-6 w-6",
                        selectedNode.type === 'company' ? 'text-blue-500' :
                        selectedNode.type === 'contact' ? 'text-green-500' : 'text-amber-500'
                      )} />
                    })()}
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedNode.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {selectedNode.type === 'company' ? 'Empresa' :
                       selectedNode.type === 'contact' ? 'Contacto' : 'Oportunidad'}
                    </Badge>
                  </div>
                </div>

                {selectedNode.email && (
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedNode.email}</p>
                  </div>
                )}

                {selectedNode.industry && (
                  <div>
                    <p className="text-xs text-muted-foreground">Industria</p>
                    <p className="text-sm">{selectedNode.industry}</p>
                  </div>
                )}

                {selectedNode.value && (
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat('es-ES', { 
                        style: 'currency', 
                        currency: 'EUR' 
                      }).format(selectedNode.value)}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Conexiones ({selectedNode.connections.length})
                  </p>
                  <div className="space-y-2">
                    {selectedNode.connections.map(connId => {
                      const connNode = networkData?.find(n => n.id === connId)
                      if (!connNode) return null
                      const Icon = getNodeIcon(connNode.type)
                      
                      return (
                        <div 
                          key={connId}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => setSelectedNode(connNode)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{connNode.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Button variant="outline" className="w-full" size="sm">
                  Ver Perfil Completo
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <NetworkIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mt-2">
                  Selecciona un nodo para ver sus detalles
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
