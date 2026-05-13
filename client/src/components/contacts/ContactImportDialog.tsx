import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import api, { formatRailsError } from '@/lib/api'
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
      const response = await api.get('/contacts/import_template', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: XLSX_MIME })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_contactos.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('Plantilla Excel descargada'),
    onError: (err: unknown) => toast.error(formatRailsError(err, 'No se pudo descargar la plantilla')),
  })

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<{ data: ImportPayload }>('/contacts/import', formData)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4" />
            Importar contactos (Excel)
          </DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <span className="block">
              Usa la plantilla <strong>.xlsx</strong>. Primera fila = cabeceras; datos desde la fila 2. Columnas:{' '}
              <code className="rounded bg-muted px-1 text-xs">
                first_name, last_name, email, phone, company, position, city, country, kind, notes
              </code>
              . También admitimos cabeceras en español (nombre, apellido, correo, teléfono, empresa…).
            </span>
            <span className="block text-muted-foreground">
              Para empresas usa <code className="text-xs">kind</code> = company o rellena solo empresa sin nombre.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={downloadTemplateMutation.isPending}
            onClick={() => downloadTemplateMutation.mutate()}
          >
            {downloadTemplateMutation.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            Descargar plantilla Excel
          </Button>
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onPickFile}
          />
          <Button type="button" variant="secondary" className="w-full gap-2" onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet className="size-4" />
            Elegir archivo Excel (.xlsx)
          </Button>
          {selectedLabel ? (
            <p className="truncate text-xs text-muted-foreground" title={selectedLabel}>
              Archivo: {selectedLabel}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={importMutation.isPending} onClick={() => void submitImport()}>
            {importMutation.isPending ? (
              <>
                <Spinner className="size-4" />
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
