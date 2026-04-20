import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus,
  ExternalLink,
  Copy,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Users,
  MousePointerClick,
  TrendingUp,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { formatDate, cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/landings')({
  component: LandingsPage,
})

interface LandingPage {
  id: string
  name: string
  slug: string
  description: string
  status: 'draft' | 'published'
  views: number
  submissions: number
  conversionRate: number
  assignedPipeline?: string
  createdAt: string
  updatedAt: string
}

function LandingsPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newLanding, setNewLanding] = useState({
    name: '',
    slug: '',
    description: '',
  })

  const { data: landings, isLoading } = useQuery({
    queryKey: ['landings'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockLandings: LandingPage[] = [
        {
          id: 'lp-1',
          name: 'Demo Producto Principal',
          slug: 'demo-producto',
          description: 'Landing page para solicitar demo del producto principal',
          status: 'published',
          views: 1523,
          submissions: 87,
          conversionRate: 5.7,
          assignedPipeline: 'Ventas Principal',
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 'lp-2',
          name: 'Webinar Marzo 2024',
          slug: 'webinar-marzo',
          description: 'Registro para el webinar de introduccion',
          status: 'published',
          views: 856,
          submissions: 124,
          conversionRate: 14.5,
          assignedPipeline: 'Consultoria',
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: 'lp-3',
          name: 'Ebook Guia CRM',
          slug: 'ebook-crm',
          description: 'Descarga gratuita del ebook sobre CRM',
          status: 'published',
          views: 2341,
          submissions: 312,
          conversionRate: 13.3,
          createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
        {
          id: 'lp-4',
          name: 'Promo Black Friday',
          slug: 'black-friday',
          description: 'Promocion especial Black Friday',
          status: 'draft',
          views: 0,
          submissions: 0,
          conversionRate: 0,
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]
      
      return mockLandings
    }
  })

  const createLandingMutation = useMutation({
    mutationFn: async (data: typeof newLanding) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { id: `lp-${Date.now()}`, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landings'] })
      toast.success('Landing page creada exitosamente')
      setIsCreateDialogOpen(false)
      setNewLanding({ name: '', slug: '', description: '' })
    },
    onError: () => {
      toast.error('Error al crear la landing page')
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' }) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { id, status }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['landings'] })
      toast.success(
        data.status === 'published' 
          ? 'Landing page publicada' 
          : 'Landing page despublicada'
      )
    }
  })

  const deleteLandingMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landings'] })
      toast.success('Landing page eliminada')
    }
  })

  const copyUrl = (slug: string) => {
    const url = `https://crm.iswo.com/l/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('URL copiada al portapapeles')
  }

  const totalViews = landings?.reduce((acc, l) => acc + l.views, 0) ?? 0
  const totalSubmissions = landings?.reduce((acc, l) => acc + l.submissions, 0) ?? 0
  const avgConversion = landings?.length 
    ? (landings.reduce((acc, l) => acc + l.conversionRate, 0) / landings.length).toFixed(1)
    : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Landing Pages</h1>
          <p className="text-sm text-muted-foreground">
            Crea y gestiona landing pages para capturar leads
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Landing
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{landings?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total landings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Visitas totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">Leads capturados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{avgConversion}%</p>
                <p className="text-xs text-muted-foreground">Conversion promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Landings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {landings?.map((landing) => (
            <Card key={landing.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{landing.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={landing.status === 'published' ? 'default' : 'secondary'}
                        className={landing.status === 'published' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                      >
                        {landing.status === 'published' ? 'Publicada' : 'Borrador'}
                      </Badge>
                      {landing.assignedPipeline && (
                        <Badge variant="outline" className="text-xs">
                          {landing.assignedPipeline}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Vista previa
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyUrl(landing.slug)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar URL
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Ver estadisticas
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => toggleStatusMutation.mutate({
                          id: landing.id,
                          status: landing.status === 'published' ? 'draft' : 'published'
                        })}
                      >
                        {landing.status === 'published' ? 'Despublicar' : 'Publicar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteLandingMutation.mutate(landing.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="line-clamp-2">
                  {landing.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    /l/{landing.slug}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5"
                    onClick={() => copyUrl(landing.slug)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {landing.status === 'published' && (
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{landing.views.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Visitas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{landing.submissions}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-lg font-semibold",
                      landing.conversionRate > 10 ? 'text-green-600' : 
                      landing.conversionRate > 5 ? 'text-amber-600' : ''
                    )}>
                      {landing.conversionRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Card */}
          <Card 
            className="border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nueva Landing Page</p>
              <p className="text-xs text-muted-foreground">Crea una nueva pagina de captura</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Landing Page</DialogTitle>
            <DialogDescription>
              Crea una nueva landing page para capturar leads
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newLanding.name}
                onChange={(e) => setNewLanding(l => ({ ...l, name: e.target.value }))}
                placeholder="Ej: Demo Producto Q2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL (slug)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/l/</span>
                <Input
                  id="slug"
                  value={newLanding.slug}
                  onChange={(e) => setNewLanding(l => ({ 
                    ...l, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') 
                  }))}
                  placeholder="demo-producto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea
                id="description"
                value={newLanding.description}
                onChange={(e) => setNewLanding(l => ({ ...l, description: e.target.value }))}
                placeholder="Describe el proposito de esta landing page..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createLandingMutation.mutate(newLanding)}
              disabled={!newLanding.name || !newLanding.slug || createLandingMutation.isPending}
            >
              {createLandingMutation.isPending && <Spinner className="mr-2" />}
              Crear Landing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
