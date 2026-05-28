import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import api, { formatRailsError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

type ImportPayload = {
  created_count: number
  skipped_count: number
  errors: Array<{ row: number; message: string }>
}

interface ContactImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function ContactImportDialog({ open, onOpenChange }: ContactImportDialogProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      // Usar fetch directamente para evitar que axios reinterprete la respuesta binaria
      const { accessToken } = useAuthStore.getState()
      const tenantSlug = window.localStorage.getItem('crm-tenant-slug') || ''
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
      const res = await fetch(`${baseUrl}/contacts/import_template`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Tenant-Slug': tenantSlug,
        },
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('[template] status:', res.status, 'body:', text)
        throw new Error(`Error ${res.status}: ${text.slice(0, 200)}`)
      }
      const arrayBuffer = await res.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: XLSX_MIME })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_contactos.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('Plantilla Excel descargada'),
    onError: (err: unknown) => toast.error(formatRailsError(err, 'No se pudo descargar la plantilla')),
  })

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      // Content-Type: undefined para que el browser setee multipart/form-data con el boundary correcto
      const response = await api.post<{ data: ImportPayload }>('/contacts/import', formData, {
        headers: { 'Content-Type': undefined },
      })
      return response.data.data
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
      const errs = data.errors?.length ?? 0
      toast.success(
        `Importación lista: ${data.created_count} creados` +
          (data.skipped_count ? `, ${data.skipped_count} filas vacías omitidas` : '') +
          (errs ? `. ${errs} filas con error (revisa el detalle).` : '')
      )
      if (errs && data.errors.length > 0) {
        const preview = data.errors.slice(0, 5).map((e) => `Fila ${e.row}: ${e.message}`)
        toast.error('Algunas filas no se importaron', {
          description: preview.join(' · '),
        })
      }
      setSelectedLabel(null)
      if (inputRef.current) inputRef.current.value = ''
      onOpenChange(false)
    },
    onError: (err: unknown) => toast.error(formatRailsError(err, 'No se pudo importar el archivo')),
  })

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedLabel(null)
      return
    }
    setSelectedLabel(file.name)
  }

  const submitImport = () => {
    const file = inputRef.current?.files?.[0]
    if (!file) {
      toast.error('Selecciona un archivo Excel (.xlsx)')
      return
    }
    importMutation.mutate(file)
  }

  const clearFile = () => {
    setSelectedLabel(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4" />
            Importar contactos
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) para crear contactos en bloque.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Instrucciones compactas */}
          <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Columnas esperadas:</span>{' '}
              <code className="rounded bg-muted px-1 text-xs">
                first_name, last_name, email, phone, company, position, city, country, kind, notes
              </code>
            </p>
            <p className="text-xs">
              Primera fila = cabeceras · También acepta nombres en español (nombre, apellido, correo…) ·
              Para empresas usa <code className="text-xs">kind = company</code>
            </p>
          </div>

          {/* Paso 1: Plantilla */}
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="min-w-0 mr-4">
              <p className="text-sm font-medium">Paso 1 — Descarga la plantilla</p>
              <p className="text-xs text-muted-foreground">Abre en Excel, rellena y guarda como .xlsx</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={downloadTemplateMutation.isPending}
              onClick={() => downloadTemplateMutation.mutate()}
            >
              {downloadTemplateMutation.isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Download className="size-3.5" />
              )}
              Descargar plantilla
            </Button>
          </div>

          {/* Paso 2: Elegir archivo */}
          <div className="rounded-md border px-4 py-3 space-y-2">
            <p className="text-sm font-medium">Paso 2 — Elige el archivo completado</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onPickFile}
            />
            {selectedLabel ? (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                <FileSpreadsheet className="size-4 shrink-0 text-emerald-500" />
                <span className="flex-1 truncate text-foreground" title={selectedLabel}>
                  {selectedLabel}
                </span>
                <button
                  type="button"
                  aria-label="Quitar archivo"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={clearFile}
                >
                  ✕
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2"
                onClick={() => inputRef.current?.click()}
              >
                <FileSpreadsheet className="size-4" />
                Elegir archivo Excel (.xlsx)
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={importMutation.isPending || !selectedLabel}
            onClick={() => void submitImport()}
          >
            {importMutation.isPending ? (
              <>
                <Spinner className="size-4 mr-1" />
                Importando…
              </>
            ) : (
              'Importar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
