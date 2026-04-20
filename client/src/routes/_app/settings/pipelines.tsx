import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  MoreHorizontal,
  GripVertical,
  Edit,
  Trash2,
  Check
} from 'lucide-react'
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
import { toast } from 'sonner'
import type { Pipeline, PipelineStage } from '@/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings/pipelines')({
  component: PipelinesSettingsPage,
})

function PipelinesSettingsPage() {
  const queryClient = useQueryClient()
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#3B82F6')
  const [newPipelineName, setNewPipelineName] = useState('')

  const { data: pipelines, isLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Ventas Principal',
          isDefault: true,
          stages: [
            { id: 'stage-1', name: 'Prospecto', order: 0, color: '#6B7280' },
            { id: 'stage-2', name: 'Calificacion', order: 1, color: '#3B82F6' },
            { id: 'stage-3', name: 'Propuesta', order: 2, color: '#8B5CF6' },
            { id: 'stage-4', name: 'Negociacion', order: 3, color: '#F59E0B' },
            { id: 'stage-5', name: 'Cerrado Ganado', order: 4, color: '#10B981' },
            { id: 'stage-6', name: 'Cerrado Perdido', order: 5, color: '#EF4444' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pipeline-2',
          name: 'Consultoria',
          isDefault: false,
          stages: [
            { id: 'stage-7', name: 'Contacto Inicial', order: 0, color: '#6B7280' },
            { id: 'stage-8', name: 'Discovery', order: 1, color: '#3B82F6' },
            { id: 'stage-9', name: 'Propuesta Tecnica', order: 2, color: '#8B5CF6' },
            { id: 'stage-10', name: 'Aprobacion', order: 3, color: '#F59E0B' },
            { id: 'stage-11', name: 'Contratado', order: 4, color: '#10B981' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      
      return mockPipelines
    }
  })

  const createPipelineMutation = useMutation({
    mutationFn: async (name: string) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { id: `pipeline-${Date.now()}`, name }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      toast.success('Pipeline creado exitosamente')
      setIsCreateDialogOpen(false)
      setNewPipelineName('')
    }
  })

  const addStageMutation = useMutation({
    mutationFn: async ({ pipelineId, name, color }: { pipelineId: string; name: string; color: string }) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { id: `stage-${Date.now()}`, name, color }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      toast.success('Etapa agregada exitosamente')
      setIsStageDialogOpen(false)
      setNewStageName('')
      setNewStageColor('#3B82F6')
    }
  })

  const deleteStageMutation = useMutation({
    mutationFn: async ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { pipelineId, stageId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      toast.success('Etapa eliminada')
    }
  })

  const colors = [
    '#6B7280', '#3B82F6', '#8B5CF6', '#EC4899', 
    '#EF4444', '#F59E0B', '#10B981', '#06B6D4'
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Pipelines</h2>
          <p className="text-sm text-muted-foreground">
            Configura los pipelines y etapas de tu proceso de ventas
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pipeline
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
      ) : (
        <div className="space-y-4">
          {pipelines?.map((pipeline) => (
            <Card key={pipeline.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{pipeline.name}</CardTitle>
                    {pipeline.isDefault && (
                      <Badge variant="secondary">Por defecto</Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar nombre</DropdownMenuItem>
                      {!pipeline.isDefault && (
                        <DropdownMenuItem>Establecer como defecto</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive">
                        Eliminar pipeline
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>
                  {pipeline.stages.length} etapas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {pipeline.stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:border-primary/50 transition-colors"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                      <div 
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm">{stage.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={() => {
                            setEditingStage(stage)
                            setSelectedPipeline(pipeline)
                            setNewStageName(stage.name)
                            setNewStageColor(stage.color)
                            setIsStageDialogOpen(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-destructive hover:text-destructive"
                          onClick={() => {
                            deleteStageMutation.mutate({
                              pipelineId: pipeline.id,
                              stageId: stage.id
                            })
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
                    onClick={() => {
                      setSelectedPipeline(pipeline)
                      setEditingStage(null)
                      setNewStageName('')
                      setNewStageColor('#3B82F6')
                      setIsStageDialogOpen(true)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Agregar etapa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pipeline Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Pipeline</DialogTitle>
            <DialogDescription>
              Crea un nuevo pipeline para organizar tus oportunidades
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipelineName">Nombre</Label>
              <Input
                id="pipelineName"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="Ej: Ventas Enterprise"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createPipelineMutation.mutate(newPipelineName)}
              disabled={!newPipelineName || createPipelineMutation.isPending}
            >
              {createPipelineMutation.isPending && <Spinner className="mr-2" />}
              Crear Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Dialog */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStage ? 'Editar Etapa' : 'Nueva Etapa'}
            </DialogTitle>
            <DialogDescription>
              {editingStage 
                ? 'Modifica los detalles de la etapa'
                : `Agrega una nueva etapa a ${selectedPipeline?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Nombre</Label>
              <Input
                id="stageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Ej: Contacto Inicial"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-md border-2 transition-all",
                      newStageColor === color 
                        ? "border-foreground scale-110" 
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStageColor(color)}
                  >
                    {newStageColor === color && (
                      <Check className="h-4 w-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedPipeline) {
                  addStageMutation.mutate({
                    pipelineId: selectedPipeline.id,
                    name: newStageName,
                    color: newStageColor
                  })
                }
              }}
              disabled={!newStageName || addStageMutation.isPending}
            >
              {addStageMutation.isPending && <Spinner className="mr-2" />}
              {editingStage ? 'Guardar Cambios' : 'Agregar Etapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
