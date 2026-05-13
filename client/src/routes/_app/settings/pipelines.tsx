import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Edit,
  Trash2,
  Check,
  Star,
} from 'lucide-react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { Pipeline, PipelineStage } from '@/types'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { jsonApiPrimaryList, mapPipelineResource } from '@/lib/opportunityApi'

export const Route = createFileRoute('/_app/settings/pipelines')({
  component: PipelinesSettingsPage,
})

function apiMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const d = err.response?.data
    if (d && typeof d === 'object') {
      const details = (d as { details?: Record<string, string[] | string> }).details
      if (details && typeof details === 'object') {
        const parts: string[] = []
        for (const v of Object.values(details)) {
          if (Array.isArray(v)) parts.push(...v.filter((x) => typeof x === 'string'))
          else if (typeof v === 'string') parts.push(v)
        }
        if (parts.length) return parts.join('. ')
      }
      const msg = (d as { message?: string }).message
      if (typeof msg === 'string' && msg) return msg
    }
    return err.message || 'Error en la petición'
  }
  return err instanceof Error ? err.message : 'Error desconocido'
}

function maxStagePosition(stages: PipelineStage[]): number {
  if (!stages.length) return -1
  let max = -1
  for (const s of stages) {
    const p = Number(s.position)
    const n = Number.isFinite(p) ? Math.floor(p) : Number.NaN
    if (!Number.isFinite(n)) continue
    if (n > max) max = n
  }
  return max
}

function PipelinesSettingsPage() {
  const queryClient = useQueryClient()
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#3B82F6')
  const [newStageClosedWon, setNewStageClosedWon] = useState(false)
  const [newStageClosedLost, setNewStageClosedLost] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [renamePipeline, setRenamePipeline] = useState<Pipeline | null>(null)
  const [renameName, setRenameName] = useState('')

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: async () => {
      const response = await api.get('/pipelines')
      const rows = jsonApiPrimaryList(response.data)
      return rows.filter((r) => r.id).map(mapPipelineResource)
    },
  })

  const invalidatePipelines = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
  }

  const createPipelineMutation = useMutation({
    mutationFn: async (payload: { name: string; is_default: boolean }) => {
      await api.post('/pipelines', {
        pipeline: {
          name: payload.name,
          is_default: payload.is_default,
        },
      })
    },
    onSuccess: () => {
      invalidatePipelines()
      toast.success('Pipeline creado')
      setIsCreateDialogOpen(false)
      setNewPipelineName('')
    },
    onError: (err) => toast.error(apiMessage(err)),
  })

  const renamePipelineMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await api.patch(`/pipelines/${id}`, { pipeline: { name } })
    },
    onSuccess: () => {
      invalidatePipelines()
      toast.success('Nombre actualizado')
      setRenameOpen(false)
      setRenamePipeline(null)
    },
    onError: (err) => toast.error(apiMessage(err)),
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/pipelines/${id}`, { pipeline: { is_default: true } })
    },
    onSuccess: () => {
      invalidatePipelines()
      toast.success('Pipeline predeterminado actualizado')
    },
    onError: (err) => toast.error(apiMessage(err)),
  })

  const deletePipelineMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/pipelines/${id}`)
    },
    onSuccess: () => {
      invalidatePipelines()
      toast.success('Pipeline eliminado')
    },
    onError: (err) => toast.error(apiMessage(err)),
  })

  const saveStageMutation = useMutation({
    mutationFn: async (args: {
      pipelineId: string
      stageId?: string
      body: Record<string, unknown>
    }) => {
      if (args.stageId) {
        await api.patch(`/pipelines/${args.pipelineId}/stages/${args.stageId}`, {
          pipeline_stage: args.body,
        })
      } else {
        await api.post(`/pipelines/${args.pipelineId}/stages`, {
          pipeline_stage: args.body,
        })
      }
    },
    onSuccess: () => {
      invalidatePipelines()
      toast.success(editingStage ? 'Etapa actualizada' : 'Etapa creada')
      setIsStageDialogOpen(false)
      setEditingStage(null)
      setNewStageName('')
      setNewStageColor('#3B82F6')
      setNewStageClosedWon(false)
      setNewStageClosedLost(false)
    },
    onError: (err) => toast.error(apiMessage(err)),
  })

  const deleteStageMutation = useMutation({
    mutationFn: async ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) => {
      await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`)
    },
    onSuccess: () => {
      invalidatePipelines()
      toast.success('Etapa eliminada')
    },
    onError: (err) => toast.error(apiMessage(err)),
  })

  const colors = [
    '#6B7280',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F59E0B',
    '#10B981',
    '#06B6D4',
  ]

  const openCreateStage = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline)
    setEditingStage(null)
    setNewStageName('')
    setNewStageColor('#3B82F6')
    setNewStageClosedWon(false)
    setNewStageClosedLost(false)
    setIsStageDialogOpen(true)
  }

  const openEditStage = (pipeline: Pipeline, stage: PipelineStage) => {
    setSelectedPipeline(pipeline)
    setEditingStage(stage)
    setNewStageName(stage.name)
    setNewStageColor(stage.color || '#3B82F6')
    setNewStageClosedWon(stage.is_closed_won)
    setNewStageClosedLost(stage.is_closed_lost)
    setIsStageDialogOpen(true)
  }

  const submitStage = () => {
    if (!selectedPipeline || !newStageName.trim()) return
    const stages = selectedPipeline.stages || []
    const maxPos = maxStagePosition(stages)
    const nextPosition = maxPos + 1
    const probability = Math.min(100, Math.max(0, (nextPosition + 1) * 15))

    if (editingStage) {
      saveStageMutation.mutate({
        pipelineId: selectedPipeline.id,
        stageId: editingStage.id,
        body: {
          name: newStageName.trim(),
          color: newStageColor,
          closed_won: newStageClosedWon,
          closed_lost: newStageClosedLost,
        },
      })
      return
    }

    saveStageMutation.mutate({
      pipelineId: selectedPipeline.id,
      body: {
        name: newStageName.trim(),
        color: newStageColor,
        position: Math.max(0, Math.floor(nextPosition)),
        probability: Math.min(100, Math.max(0, Math.floor(probability))),
        closed_won: newStageClosedWon,
        closed_lost: newStageClosedLost,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Pipelines</h2>
          <p className="text-sm text-muted-foreground">
            Crea embudos y etapas; aparecerán como opciones al dar de alta oportunidades.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo pipeline
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-24" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay pipelines. Crea el primero para definir etapas (Nueva, Contactada, etc.).
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => {
            const sortedStages = [...(pipeline.stages || [])].sort((a, b) => a.position - b.position)
            return (
              <Card key={pipeline.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{pipeline.name}</CardTitle>
                      {pipeline.is_default && <Badge variant="secondary">Por defecto</Badge>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamePipeline(pipeline)
                            setRenameName(pipeline.name)
                            setRenameOpen(true)
                          }}
                        >
                          Editar nombre
                        </DropdownMenuItem>
                        {!pipeline.is_default && (
                          <DropdownMenuItem
                            onClick={() => setDefaultMutation.mutate(pipeline.id)}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Establecer como predeterminado
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Eliminar el pipeline "${pipeline.name}"? No debe tener oportunidades activas.`
                              )
                            ) {
                              deletePipelineMutation.mutate(pipeline.id)
                            }
                          }}
                        >
                          Eliminar pipeline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{sortedStages.length} etapas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sortedStages.map((stage) => (
                      <div
                        key={stage.id}
                        className="group flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 transition-colors hover:border-primary/50"
                      >
                        <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground" />
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: stage.color || '#94A3B8' }}
                        />
                        <span className="text-sm">{stage.name}</span>
                        {(stage.is_closed_won || stage.is_closed_lost) && (
                          <Badge variant="outline" className="text-[10px]">
                            {stage.is_closed_won ? 'Ganada' : 'Perdida'}
                          </Badge>
                        )}
                        <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            type="button"
                            onClick={() => openEditStage(pipeline, stage)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive hover:text-destructive"
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(`¿Eliminar la etapa "${stage.name}"?`)
                              ) {
                                deleteStageMutation.mutate({
                                  pipelineId: pipeline.id,
                                  stageId: stage.id,
                                })
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      type="button"
                      onClick={() => openCreateStage(pipeline)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Agregar etapa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo pipeline</DialogTitle>
            <DialogDescription>
              Un pipeline agrupa etapas (columnas del Kanban). El primero puede marcarse como predeterminado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipelineName">Nombre</Label>
              <Input
                id="pipelineName"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="Ej: Ventas"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                createPipelineMutation.mutate({
                  name: newPipelineName.trim(),
                  is_default: pipelines.length === 0,
                })
              }
              disabled={!newPipelineName.trim() || createPipelineMutation.isPending}
            >
              {createPipelineMutation.isPending && <Spinner className="mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="renameName">Nombre</Label>
            <Input
              id="renameName"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!renameName.trim() || !renamePipeline || renamePipelineMutation.isPending}
              onClick={() => {
                if (renamePipeline) {
                  renamePipelineMutation.mutate({ id: renamePipeline.id, name: renameName.trim() })
                }
              }}
            >
              {renamePipelineMutation.isPending && <Spinner className="mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Editar etapa' : 'Nueva etapa'}</DialogTitle>
            <DialogDescription>
              {editingStage
                ? 'Nombre, color y tipo de cierre (opcional).'
                : `Etapa en «${selectedPipeline?.name}».`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Nombre</Label>
              <Input
                id="stageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Ej: Calificación"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-md border-2 transition-all',
                      newStageColor === color
                        ? 'scale-110 border-foreground'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStageColor(color)}
                  >
                    {newStageColor === color && (
                      <Check className="mx-auto h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Opciones de etapa final</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={newStageClosedWon}
                  onCheckedChange={(v) => {
                    const on = v === true
                    setNewStageClosedWon(on)
                    if (on) setNewStageClosedLost(false)
                  }}
                />
                Cierre ganado (oportunidad ganada)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={newStageClosedLost}
                  onCheckedChange={(v) => {
                    const on = v === true
                    setNewStageClosedLost(on)
                    if (on) setNewStageClosedWon(false)
                  }}
                />
                Cierre perdido
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submitStage}
              disabled={!newStageName.trim() || saveStageMutation.isPending}
            >
              {saveStageMutation.isPending && <Spinner className="mr-2" />}
              {editingStage ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
