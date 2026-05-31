import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Download, FileSpreadsheet, Loader2, SlidersHorizontal } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  buildContactExportFilters,
  downloadContactsExport,
  enqueueContactsExport,
  triggerBlobDownload,
  type ContactExportFormat,
  type ContactKind,
} from '@/lib/contactApi'
import { formatRailsError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const DATE_RANGE_OPTIONS = [
  { value: 'all',     label: 'Cualquier fecha'  },
  { value: 'week',    label: 'Última semana'    },
  { value: 'month',   label: 'Último mes'       },
  { value: 'quarter', label: 'Último trimestre' },
  { value: 'year',    label: 'Último año'       },
]

const SOURCE_KIND_OPTIONS = [
  { value: 'web',      label: 'Web / Orgánico'     },
  { value: 'whatsapp', label: 'WhatsApp'            },
  { value: 'meta',     label: 'Meta Ads'            },
  { value: 'google',   label: 'Google Ads'          },
  { value: 'referral', label: 'Referido'            },
  { value: 'manual',   label: 'Manual / Presencial' },
]

interface ContactsExportMenuProps {
  kind?: ContactKind
  ownerId?: string
  disabled?: boolean
}

export function ContactsExportMenu({ kind, ownerId, disabled }: ContactsExportMenuProps) {
  const role = useAuthStore((s) => s.user?.role)
  const canExport = role === 'admin' || role === 'manager'

  const [open, setOpen]             = useState(false)
  const [dateRange, setDateRange]   = useState('all')
  const [sourceKind, setSourceKind] = useState('')

  const filters = buildContactExportFilters({
    kind,
    owner_id:    ownerId,
    date_range:  dateRange !== 'all' ? dateRange : undefined,
    source_kind: sourceKind || undefined,
  })

  const downloadMutation = useMutation({
    mutationFn: async (format: ContactExportFormat) => {
      const blob = await downloadContactsExport(format, filters)
      const label = kind === 'company' ? 'empresas' : 'contactos'
      triggerBlobDownload(blob, `${label}_${new Date().toISOString().slice(0, 10)}.${format}`)
    },
    onSuccess: () => { toast.success('Exportación descargada'); setOpen(false) },
    onError: (err: unknown) =>
      toast.error(formatRailsError(err, 'No se pudo exportar')),
  })

  const enqueueMutation = useMutation({
    mutationFn: (format: ContactExportFormat) => enqueueContactsExport(format, filters),
    onSuccess: () => {
      toast.success('Exportación encolada — revisa Exportaciones cuando esté lista')
      setOpen(false)
    },
    onError: (err: unknown) =>
      toast.error(formatRailsError(err, 'No se pudo encolar la exportación')),
  })

  if (!canExport) return null

  const busy = downloadMutation.isPending || enqueueMutation.isPending
  const activeFiltersCount = [
    dateRange !== 'all',
    !!sourceKind,
  ].filter(Boolean).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={disabled || busy}
        >
          {busy
            ? <Loader2 className="size-3.5 animate-spin" />
            : <Download className="size-3.5" />}
          <span className="hidden sm:inline">Exportar</span>
          {activeFiltersCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-4 space-y-4">
        {/* Filtros — RFC §6.7 */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <SlidersHorizontal className="size-3" />
            Filtros
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label className="text-xs">Rango de fecha</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Origen */}
          <div className="space-y-1.5">
            <Label className="text-xs">Origen del lead</Label>
            <Select
              value={sourceKind || '__all__'}
              onValueChange={(v) => setSourceKind(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Todos los orígenes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los orígenes</SelectItem>
                {SOURCE_KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Acciones de descarga */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Descargar directamente</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-xs"
              disabled={busy}
              onClick={() => downloadMutation.mutate('xlsx')}
            >
              <FileSpreadsheet className="size-3.5" />
              Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-xs"
              disabled={busy}
              onClick={() => downloadMutation.mutate('csv')}
            >
              <Download className="size-3.5" />
              CSV
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="w-full text-xs text-muted-foreground"
            disabled={busy}
            onClick={() => enqueueMutation.mutate('xlsx')}
          >
            Encolar Excel (volúmenes grandes)
          </Button>

          <Link
            to="/exports"
            className="flex justify-center text-xs text-primary hover:underline pt-1"
            onClick={() => setOpen(false)}
          >
            Ver historial de exportaciones →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
