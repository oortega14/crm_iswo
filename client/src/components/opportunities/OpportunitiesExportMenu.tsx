import { Link } from '@tanstack/react-router'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  buildOpportunityExportFilters,
  downloadOpportunitiesExport,
  enqueueOpportunitiesExport,
  triggerBlobDownload,
  type OpportunityExportFormat,
} from '@/lib/opportunityApi'
import { formatRailsError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

interface OpportunitiesExportMenuProps {
  pipelineId?: string
  stageId?: string
  ownerId?: string
  temperature?: string
  disabled?: boolean
}

export function OpportunitiesExportMenu({
  pipelineId,
  stageId,
  ownerId,
  temperature,
  disabled,
}: OpportunitiesExportMenuProps) {
  const role = useAuthStore((s) => s.user?.role)
  const canExport = role === 'admin' || role === 'manager'

  const filters = buildOpportunityExportFilters({
    pipeline_id: pipelineId,
    stage_id: stageId,
    owner_id: ownerId,
    temperature,
  })

  const downloadMutation = useMutation({
    mutationFn: async (format: OpportunityExportFormat) => {
      const blob = await downloadOpportunitiesExport(format, filters)
      triggerBlobDownload(
        blob,
        `oportunidades_${new Date().toISOString().slice(0, 10)}.${format}`,
      )
    },
    onSuccess: () => toast.success('Exportación descargada'),
    onError: (err: unknown) =>
      toast.error(formatRailsError(err, 'No se pudo exportar. Prueba encolar desde el menú.')),
  })

  const enqueueMutation = useMutation({
    mutationFn: (format: OpportunityExportFormat) => enqueueOpportunitiesExport(format, filters),
    onSuccess: () => {
      toast.success('Exportación encolada — revisa Exportaciones cuando esté lista')
    },
    onError: (err: unknown) => toast.error(formatRailsError(err, 'No se pudo encolar la exportación')),
  })

  if (!canExport) return null

  const busy = downloadMutation.isPending || enqueueMutation.isPending

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={disabled || busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => downloadMutation.mutate('xlsx')}
          disabled={busy}
        >
          <FileSpreadsheet className="size-4 mr-2" />
          Descargar Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => downloadMutation.mutate('csv')}
          disabled={busy}
        >
          <Download className="size-4 mr-2" />
          Descargar CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => enqueueMutation.mutate('xlsx')}
          disabled={busy}
        >
          Encolar Excel (muchas filas)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/exports" className="cursor-pointer">
            Ver historial de exportaciones
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
