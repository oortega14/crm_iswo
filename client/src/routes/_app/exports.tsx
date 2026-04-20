import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/_app/exports')({
  component: ExportsPage,
})

interface Export {
  id: string
  name: string
  type: 'opportunities' | 'contacts' | 'companies' | 'activities'
  format: 'csv' | 'xlsx' | 'pdf'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  recordsCount?: number
  fileSize?: string
  createdAt: string
  completedAt?: string
  downloadUrl?: string
}

function ExportsPage() {
  const queryClient = useQueryClient()
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportConfig, setExportConfig] = useState({
    type: 'opportunities',
    format: 'xlsx',
    includeArchived: false,
    dateRange: 'all'
  })

  const { data: exports, isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockExports: Export[] = [
        {
          id: 'exp-1',
          name: 'Oportunidades Q1 2024',
          type: 'opportunities',
          format: 'xlsx',
          status: 'completed',
          recordsCount: 156,
          fileSize: '245 KB',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          completedAt: new Date(Date.now() - 2 * 86400000 + 30000).toISOString(),
          downloadUrl: '#'
        },
        {
          id: 'exp-2',
          name: 'Contactos Activos',
          type: 'contacts',
          format: 'csv',
          status: 'completed',
          recordsCount: 432,
          fileSize: '128 KB',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          completedAt: new Date(Date.now() - 5 * 86400000 + 45000).toISOString(),
          downloadUrl: '#'
        },
        {
          id: 'exp-3',
          name: 'Empresas - Todos',
          type: 'companies',
          format: 'xlsx',
          status: 'processing',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'exp-4',
          name: 'Reporte Actividad Mensual',
          type: 'activities',
          format: 'pdf',
          status: 'completed',
          recordsCount: 1243,
          fileSize: '1.2 MB',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          completedAt: new Date(Date.now() - 7 * 86400000 + 120000).toISOString(),
          downloadUrl: '#'
        },
        {
          id: 'exp-5',
          name: 'Oportunidades Cerradas',
          type: 'opportunities',
          format: 'csv',
          status: 'failed',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ]
      
      return mockExports
    }
  })

  const createExportMutation = useMutation({
    mutationFn: async (config: typeof exportConfig) => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return { id: `exp-${Date.now()}`, ...config }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] })
      toast.success('Exportacion iniciada')
      setIsExportDialogOpen(false)
    },
    onError: () => {
      toast.error('Error al iniciar la exportacion')
    }
  })

  const deleteExportMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] })
      toast.success('Exportacion eliminada')
    }
  })

  const getStatusBadge = (status: Export['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completado
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            Procesando
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="mr-1 h-3 w-3" />
            Fallido
          </Badge>
        )
    }
  }

  const getTypeIcon = (type: Export['type']) => {
    switch (type) {
      case 'opportunities':
      case 'contacts':
      case 'companies':
        return FileSpreadsheet
      case 'activities':
        return FileText
      default:
        return FileText
    }
  }

  const getTypeName = (type: Export['type']) => {
    switch (type) {
      case 'opportunities': return 'Oportunidades'
      case 'contacts': return 'Contactos'
      case 'companies': return 'Empresas'
      case 'activities': return 'Actividades'
    }
  }

  const completedExports = exports?.filter(e => e.status === 'completed').length ?? 0
  const processingExports = exports?.filter(e => e.status === 'processing').length ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Exportaciones</h1>
          <p className="text-sm text-muted-foreground">
            Exporta tus datos en diferentes formatos
          </p>
        </div>
        <Button size="sm" onClick={() => setIsExportDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Exportacion
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{exports?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total exportaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{completedExports}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{processingExports}</p>
                <p className="text-xs text-muted-foreground">En proceso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Exportaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports?.map((exp) => {
                  const Icon = getTypeIcon(exp.type)
                  return (
                    <TableRow key={exp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{exp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getTypeName(exp.type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {exp.format}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(exp.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {exp.recordsCount ? (
                          <span>{exp.recordsCount.toLocaleString()} registros</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(exp.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {exp.status === 'completed' && exp.downloadUrl && (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteExportMutation.mutate(exp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Exportacion</DialogTitle>
            <DialogDescription>
              Configura los parametros de tu exportacion
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de datos</Label>
              <Select 
                value={exportConfig.type} 
                onValueChange={(v) => setExportConfig(c => ({ ...c, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opportunities">Oportunidades</SelectItem>
                  <SelectItem value="contacts">Contactos</SelectItem>
                  <SelectItem value="companies">Empresas</SelectItem>
                  <SelectItem value="activities">Actividades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato</Label>
              <Select 
                value={exportConfig.format} 
                onValueChange={(v) => setExportConfig(c => ({ ...c, format: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rango de fechas</Label>
              <Select 
                value={exportConfig.dateRange} 
                onValueChange={(v) => setExportConfig(c => ({ ...c, dateRange: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los registros</SelectItem>
                  <SelectItem value="week">Ultima semana</SelectItem>
                  <SelectItem value="month">Ultimo mes</SelectItem>
                  <SelectItem value="quarter">Ultimo trimestre</SelectItem>
                  <SelectItem value="year">Ultimo ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="includeArchived"
                checked={exportConfig.includeArchived}
                onCheckedChange={(v) => setExportConfig(c => ({ ...c, includeArchived: v as boolean }))}
              />
              <Label htmlFor="includeArchived" className="text-sm font-normal">
                Incluir registros archivados
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createExportMutation.mutate(exportConfig)}
              disabled={createExportMutation.isPending}
            >
              {createExportMutation.isPending && <Spinner className="mr-2" />}
              Iniciar Exportacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
