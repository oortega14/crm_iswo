import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import api, { formatRailsError } from '@/lib/api'
import { useAuthStore, useTenant } from '@/stores/auth'

export const Route = createFileRoute('/_app/settings/bant')({
  component: BantSettingsPage,
})

interface BantCriterion {
  budget_weight:       number
  authority_weight:    number
  need_weight:         number
  timeline_weight:     number
  threshold_qualified: number
  description?:        string
  active:              boolean
  weights_total:       number
}

function mapBant(data: unknown): BantCriterion {
  const a = (data as { data?: { attributes?: Record<string, unknown> } })?.data?.attributes ?? {}
  return {
    budget_weight:       Number(a.budget_weight       ?? 25),
    authority_weight:    Number(a.authority_weight    ?? 25),
    need_weight:         Number(a.need_weight         ?? 25),
    timeline_weight:     Number(a.timeline_weight     ?? 25),
    threshold_qualified: Number(a.threshold_qualified ?? 60),
    description:         typeof a.description === 'string' ? a.description : undefined,
    active:              Boolean(a.active              ?? true),
    weights_total:       Number(a.weights_total        ?? 100),
  }
}

const DIMENSIONS = [
  { key: 'budget_weight'    as const, label: 'Presupuesto (Budget)',   color: 'bg-blue-500'  },
  { key: 'authority_weight' as const, label: 'Autoridad (Authority)',  color: 'bg-purple-500'},
  { key: 'need_weight'      as const, label: 'Necesidad (Need)',       color: 'bg-amber-500' },
  { key: 'timeline_weight'  as const, label: 'Plazo (Timeline)',       color: 'bg-emerald-500'},
]

function BantSettingsPage() {
  const queryClient = useQueryClient()
  const canEdit = useAuthStore((s) => s.isAdmin())
  const tenant = useTenant()
  const [staleDays, setStaleDays] = useState(7)

  useEffect(() => {
    setStaleDays(tenant?.settings?.stale_days ?? 7)
  }, [tenant?.settings?.stale_days])

  const staleMutation = useMutation({
    mutationFn: async (days: number) => {
      await api.patch('/tenant', { tenant: { settings: { stale_days: days } } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast.success('Umbral de inactividad actualizado')
    },
    onError: (err: unknown) => toast.error(formatRailsError(err, 'No se pudo guardar')),
  })

  const { data: criterion, isLoading, isError } = useQuery({
    queryKey: ['bant_criterion'],
    queryFn: async () => {
      const res = await api.get('/bant_criterion')
      return mapBant(res.data)
    },
  })

  const [weights, setWeights] = useState({ budget_weight: 25, authority_weight: 25, need_weight: 25, timeline_weight: 25 })
  const [threshold, setThreshold] = useState(60)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!criterion) return
    setWeights({
      budget_weight:    criterion.budget_weight,
      authority_weight: criterion.authority_weight,
      need_weight:      criterion.need_weight,
      timeline_weight:  criterion.timeline_weight,
    })
    setThreshold(criterion.threshold_qualified)
    setDescription(criterion.description ?? '')
  }, [criterion])

  const total = weights.budget_weight + weights.authority_weight + weights.need_weight + weights.timeline_weight
  const isValid = total === 100

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/bant_criterion', {
        bant_criterion: {
          ...weights,
          threshold_qualified: threshold,
          description: description || undefined,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bant_criterion'] })
      toast.success('Configuración BANT actualizada')
    },
    onError: (err: unknown) => toast.error(formatRailsError(err, 'No se pudo guardar')),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">No se pudo cargar la configuración BANT.</p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Configuración BANT</h2>
        <p className="text-sm text-muted-foreground">
          Define los pesos de cada dimensión y el umbral de calificación. La suma de pesos debe ser exactamente 100.
        </p>
      </div>

      {/* Pesos por dimensión */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesos por dimensión</CardTitle>
          <CardDescription>
            Ajusta la importancia relativa de cada dimensión BANT según tu modelo de negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{dim.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[dim.key]}
                    onChange={(e) =>
                      setWeights((prev) => ({
                        ...prev,
                        [dim.key]: Math.min(100, Math.max(0, Number(e.target.value))),
                      }))
                    }
                    className="w-16 h-7 text-center text-sm"
                    disabled={!canEdit}
                  />
                  <span className="text-sm text-muted-foreground w-3">%</span>
                </div>
              </div>
              <Slider
                value={[weights[dim.key]]}
                min={0}
                max={100}
                step={5}
                disabled={!canEdit}
                onValueChange={([v]) =>
                  setWeights((prev) => ({ ...prev, [dim.key]: v }))
                }
                className={cn('[&_[data-slot=slider-range]]:', dim.color)}
              />
            </div>
          ))}

          <Separator />

          {/* Totalizador */}
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="text-sm font-medium">Total de pesos</span>
            <Badge
              variant={isValid ? 'success' : 'destructive'}
              className="text-base font-mono"
            >
              {total} / 100
            </Badge>
          </div>

          {!isValid && (
            <p className="text-xs text-destructive">
              La suma debe ser exactamente 100. Actualmente es {total}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Umbral de calificación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Umbral de calificación</CardTitle>
          <CardDescription>
            Puntaje mínimo (0–100) para que una oportunidad se marque automáticamente como «Calificada».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Slider
              value={[threshold]}
              min={0}
              max={100}
              step={5}
              disabled={!canEdit}
              onValueChange={([v]) => setThreshold(v)}
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-16 h-7 text-center text-sm"
                disabled={!canEdit}
              />
              <span className="text-sm text-muted-foreground">pts</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Una oportunidad con puntaje BANT ≥ {threshold} se marcará como calificada.
          </p>
        </CardContent>
      </Card>

      {/* Descripción */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descripción</CardTitle>
          <CardDescription>Nota interna sobre el criterio de calificación de este tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={3}
            placeholder="Ej: Pesos ajustados para ciclo de venta inmobiliaria..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-50"
          />
        </CardContent>
      </Card>

      {/* Umbral de inactividad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inactividad en pipeline</CardTitle>
          <CardDescription>
            Días sin actividad para marcar una oportunidad con el indicador de alerta (ícono de reloj en Kanban).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Slider
              value={[staleDays]}
              min={1}
              max={60}
              step={1}
              disabled={!canEdit}
              onValueChange={([v]) => setStaleDays(v)}
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={60}
                value={staleDays}
                onChange={(e) => setStaleDays(Math.min(60, Math.max(1, Number(e.target.value))))}
                className="w-16 h-7 text-center text-sm"
                disabled={!canEdit}
              />
              <span className="text-sm text-muted-foreground">días</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Las oportunidades sin actividad hace más de {staleDays} día(s) aparecerán resaltadas en el pipeline.
          </p>
          {canEdit && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => staleMutation.mutate(staleDays)}
                disabled={staleMutation.isPending}
              >
                {staleMutation.isPending && <Spinner className="mr-2 size-3" />}
                Guardar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
          >
            {saveMutation.isPending && <Spinner className="mr-2 size-4" />}
            Guardar cambios
          </Button>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-muted-foreground text-center">
          Solo los administradores pueden modificar la configuración BANT.
        </p>
      )}
    </div>
  )
}
