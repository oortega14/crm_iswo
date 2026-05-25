import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  ExternalLink,
  Copy,
  MoreHorizontal,
  Eye,
  Trash2,
  BarChart3,
  Users,
  TrendingUp,
  Globe,
  CopyPlus,
  Pencil,
  QrCode,
  Download,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, type JsonApiResource } from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LandingEditorSheet } from '@/components/landings/LandingEditorSheet'
import { LandingMetricsSheet } from '@/components/landings/LandingMetricsSheet'

export const Route = createFileRoute('/_app/landings')({
  component: LandingsPage,
})

interface LandingPage {
  id: string
  title: string
  slug: string
  description: string
  publicUrl: string
  status: 'draft' | 'published'
  views: number
  leads: number
  conversionRate: number
  createdAt: string
  updatedAt: string
}

function mapLanding(resource: JsonApiResource): LandingPage | null {
  if (!resource.id) return null
  const a = resource.attributes ?? {}

  const title = String(a.title ?? '').trim()
  const slug = String(a.slug ?? '').trim()
  if (!title || !slug) return null

  const views = Number(a.view_count ?? 0)
  const leads = Number(a.lead_count ?? 0)
  const conversionRate = views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0

  return {
    id: String(resource.id),
    title,
    slug,
    description: String(a.seo_description ?? ''),
    publicUrl: String(a.public_url ?? ''),
    status: a.published ? 'published' : 'draft',
    views: Number.isFinite(views) ? views : 0,
    leads: Number.isFinite(leads) ? leads : 0,
    conversionRate,
    createdAt: String(a.created_at ?? new Date().toISOString()),
    updatedAt: String(a.updated_at ?? new Date().toISOString()),
  }
}

function LandingsPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newLanding, setNewLanding] = useState({
    title: '',
    slug: '',
    description: '',
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editorLanding, setEditorLanding] = useState<{ id: string; title: string } | null>(null)
  const [metricsLanding, setMetricsLanding] = useState<{ id: string; title: string } | null>(null)
  const [qrLanding, setQrLanding] = useState<LandingPage | null>(null)

  const {
    data: landings = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.landingPages.all,
    queryFn: async () => {
      const response = await api.get('/landing_pages', { params: { page: 1, items: 100 } })
      return jsonApiPrimaryList(response.data)
        .map(mapLanding)
        .filter((x): x is LandingPage => x !== null)
    },
  })

  const createLandingMutation = useMutation({
    mutationFn: async (data: typeof newLanding) => {
      return api.post('/landing_pages', {
        landing_page: {
          title: data.title.trim(),
          slug: data.slug.trim(),
          seo_description: data.description.trim() || undefined,
          published: false,
          content: {},
          styles: {},
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.all })
      toast.success('Landing page creada exitosamente')
      setIsCreateDialogOpen(false)
      setNewLanding({ title: '', slug: '', description: '' })
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'Error al crear la landing page'))
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' }) => {
      if (status === 'published') return api.post(`/landing_pages/${id}/publish`)
      return api.post(`/landing_pages/${id}/unpublish`)
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.all })
      toast.success(
        vars.status === 'published'
          ? 'Landing page publicada' 
          : 'Landing page despublicada'
      )
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo cambiar el estado de la landing'))
    },
  })

  const duplicateLandingMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/landing_pages/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.all })
      toast.success('Landing duplicada')
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo duplicar la landing'))
    },
  })

  const deleteLandingMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/landing_pages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.all })
      toast.success('Landing page eliminada')
      setConfirmDeleteId(null)
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo eliminar la landing'))
    },
  })

  const titleToSlug = (title: string) =>
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)

  const getPublicUrl = (landing: LandingPage) =>
    `${window.location.origin}/l/${landing.slug}`

  const copyUrl = (landing: LandingPage) => {
    navigator.clipboard.writeText(getPublicUrl(landing))
    toast.success('URL copiada al portapapeles')
  }

  const totalViews = landings?.reduce((acc, l) => acc + l.views, 0) ?? 0
  const totalLeads = landings?.reduce((acc, l) => acc + l.leads, 0) ?? 0
  const avgConversion = landings?.length
    ? (landings.reduce((acc, l) => acc + l.conversionRate, 0) / landings.length).toFixed(1)
    : 0

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Landing pages"
        description="Crea y gestiona landing pages para capturar leads"
      >
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isRefetching}>
          {isRefetching ? <Spinner className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          Actualizar
        </Button>
        <Button size="sm" className="shadow-sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva landing
        </Button>
      </PageHeader>

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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Eye className="h-5 w-5 text-primary" />
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{totalLeads}</p>
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

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {formatRailsError(error, 'No se pudieron cargar las landings')}
          </CardContent>
        </Card>
      ) : isLoading ? (
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
                    <CardTitle className="text-base">{landing.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={landing.status === 'published' ? 'default' : 'secondary'}>
                        {landing.status === 'published' ? 'Publicada' : 'Borrador'}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditorLanding({ id: landing.id, title: landing.title })}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar contenido
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateLandingMutation.mutate(landing.id)}>
                        <CopyPlus className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyUrl(landing)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setQrLanding(landing)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Ver QR
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMetricsLanding({ id: landing.id, title: landing.title })}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Ver estadísticas
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
                        onClick={() => setConfirmDeleteId(landing.id)}
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
                    onClick={() => copyUrl(landing)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {landing.status === 'published' && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                      <a
                        href={getPublicUrl(landing)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-3 h-8 text-xs"
                  onClick={() => setEditorLanding({ id: landing.id, title: landing.title })}
                >
                  <Pencil className="mr-1.5 h-3 w-3" />
                  Editar contenido
                </Button>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{landing.views.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Visitas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{landing.leads}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-lg font-semibold",
                      landing.conversionRate > 10 ? 'text-primary' :
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

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar landing page</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminarán también las métricas y submissions asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              disabled={deleteLandingMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (confirmDeleteId) deleteLandingMutation.mutate(confirmDeleteId) }}
              disabled={deleteLandingMutation.isPending}
            >
              {deleteLandingMutation.isPending ? <Spinner className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={!!qrLanding} onOpenChange={(o) => { if (!o) setQrLanding(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR</DialogTitle>
            <DialogDescription className="truncate">{qrLanding?.title}</DialogDescription>
          </DialogHeader>
          {qrLanding && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div id="landing-qr-container" className="rounded-xl border bg-white p-4">
                <QRCodeSVG
                  value={getPublicUrl(qrLanding)}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center break-all px-2">
                {getPublicUrl(qrLanding)}
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(getPublicUrl(qrLanding))
                    toast.success('URL copiada')
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar URL
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    const svg = document.querySelector('#landing-qr-container svg') as SVGElement | null
                    if (!svg) return
                    const xml = new XMLSerializer().serializeToString(svg)
                    const blob = new Blob([xml], { type: 'image/svg+xml' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `qr-${qrLanding.slug}.svg`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar SVG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Métricas */}
      <LandingMetricsSheet
        open={!!metricsLanding}
        onOpenChange={(open) => { if (!open) setMetricsLanding(null) }}
        landingId={metricsLanding?.id ?? null}
        landingTitle={metricsLanding?.title}
      />

      {/* Editor de contenido */}
      <LandingEditorSheet
        open={!!editorLanding}
        onOpenChange={(open) => { if (!open) setEditorLanding(null) }}
        landingId={editorLanding?.id ?? null}
        landingTitle={editorLanding?.title}
      />

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
                value={newLanding.title}
                onChange={(e) => {
                  const title = e.target.value
                  setNewLanding(l => ({
                    ...l,
                    title,
                    slug: l.slug === '' || l.slug === titleToSlug(l.title)
                      ? titleToSlug(title)
                      : l.slug,
                  }))
                }}
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
              {newLanding.slug !== '' && newLanding.slug === titleToSlug(newLanding.title) && (
                <p className="text-xs text-muted-foreground">Auto-generado · edita el campo para personalizar</p>
              )}
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
              disabled={!newLanding.title || !newLanding.slug || createLandingMutation.isPending}
            >
              {createLandingMutation.isPending && <Spinner className="mr-2" />}
              Crear Landing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageShell>
  )
}
