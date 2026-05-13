import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import api, { formatRailsError } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { jsonApiPrimaryOne } from '@/lib/opportunityApi'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'tel' | 'email' | 'textarea'
  enabled: boolean
  required: boolean
}

interface LandingContent {
  headline: string
  subheadline: string
  cta_text: string
  thank_you_title: string
  thank_you_message: string
  fields: FieldConfig[]
}

interface LandingStyles {
  primary_color: string
  background_color: string
}

// ---------------------------------------------------------------------------
// Valores por defecto
// ---------------------------------------------------------------------------

const DEFAULT_FIELDS: FieldConfig[] = [
  { name: 'first_name', label: 'Nombre',             type: 'text',     enabled: true,  required: true  },
  { name: 'last_name',  label: 'Apellido',            type: 'text',     enabled: true,  required: true  },
  { name: 'phone',      label: 'Teléfono',            type: 'tel',      enabled: true,  required: true  },
  { name: 'email',      label: 'Correo electrónico',  type: 'email',    enabled: true,  required: false },
  { name: 'company',    label: 'Empresa',             type: 'text',     enabled: false, required: false },
  { name: 'message',    label: 'Mensaje',             type: 'textarea', enabled: false, required: false },
]

const DEFAULT_CONTENT: LandingContent = {
  headline:          '',
  subheadline:       '',
  cta_text:          'Enviar solicitud',
  thank_you_title:   '¡Gracias!',
  thank_you_message: 'Un asesor te contactará pronto.',
  fields:            DEFAULT_FIELDS,
}

const DEFAULT_STYLES: LandingStyles = {
  primary_color:    '#0F172A',
  background_color: '#F8FAFC',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeContent(raw: unknown): LandingContent {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONTENT, fields: [...DEFAULT_FIELDS] }
  const r = raw as Record<string, unknown>

  const rawFields = Array.isArray(r.fields) ? (r.fields as FieldConfig[]) : []

  // Combinar campos guardados con los predeterminados para que nunca falte ninguno
  const mergedFields = DEFAULT_FIELDS.map((def) => {
    const saved = rawFields.find((f) => f.name === def.name)
    if (!saved) return { ...def }
    return {
      ...def,
      label:    typeof saved.label    === 'string'  ? saved.label    : def.label,
      enabled:  typeof saved.enabled  === 'boolean' ? saved.enabled  : def.enabled,
      required: typeof saved.required === 'boolean' ? saved.required : def.required,
    }
  })

  return {
    headline:          typeof r.headline          === 'string' ? r.headline          : DEFAULT_CONTENT.headline,
    subheadline:       typeof r.subheadline       === 'string' ? r.subheadline       : DEFAULT_CONTENT.subheadline,
    cta_text:          typeof r.cta_text          === 'string' ? r.cta_text          : DEFAULT_CONTENT.cta_text,
    thank_you_title:   typeof r.thank_you_title   === 'string' ? r.thank_you_title   : DEFAULT_CONTENT.thank_you_title,
    thank_you_message: typeof r.thank_you_message === 'string' ? r.thank_you_message : DEFAULT_CONTENT.thank_you_message,
    fields:            mergedFields,
  }
}

function mergeStyles(raw: unknown): LandingStyles {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STYLES }
  const r = raw as Record<string, unknown>
  return {
    primary_color:    typeof r.primary_color    === 'string' ? r.primary_color    : DEFAULT_STYLES.primary_color,
    background_color: typeof r.background_color === 'string' ? r.background_color : DEFAULT_STYLES.background_color,
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LandingEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  landingId: string | null
  landingTitle?: string
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function LandingEditorSheet({
  open,
  onOpenChange,
  landingId,
  landingTitle,
}: LandingEditorSheetProps) {
  const queryClient = useQueryClient()

  const [content, setContent] = useState<LandingContent>({ ...DEFAULT_CONTENT, fields: [...DEFAULT_FIELDS] })
  const [styles,  setStyles]  = useState<LandingStyles>({ ...DEFAULT_STYLES })

  // Fetch del landing con content + styles
  const { data: landingData, isLoading } = useQuery({
    queryKey: queryKeys.landingPages.detail(landingId ?? ''),
    queryFn:  async () => {
      const res = await api.get(`/landing_pages/${landingId}`)
      return jsonApiPrimaryOne(res.data)
    },
    enabled: open && !!landingId,
  })

  // Sincronizar formulario cuando llegan los datos
  useEffect(() => {
    if (!landingData) return
    const attrs = landingData.attributes ?? {}
    setContent(mergeContent(attrs.content))
    setStyles(mergeStyles(attrs.styles))
  }, [landingData])

  // Resetear al cerrar
  useEffect(() => {
    if (!open) {
      setContent({ ...DEFAULT_CONTENT, fields: [...DEFAULT_FIELDS] })
      setStyles({ ...DEFAULT_STYLES })
    }
  }, [open])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/landing_pages/${landingId}`, {
        landing_page: { content, styles },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.landingPages.detail(landingId ?? '') })
      toast.success('Landing page guardada')
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo guardar la landing page'))
    },
  })

  // ---- Helpers de estado ----

  const setField = <K extends keyof LandingContent>(key: K, value: LandingContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }))

  const setStyle = <K extends keyof LandingStyles>(key: K, value: LandingStyles[K]) =>
    setStyles((s) => ({ ...s, [key]: value }))

  const updateField = (name: string, patch: Partial<FieldConfig>) =>
    setContent((c) => ({
      ...c,
      fields: c.fields.map((f) => (f.name === name ? { ...f, ...patch } : f)),
    }))

  const enabledCount = content.fields.filter((f) => f.enabled).length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-base">Editar landing page</SheetTitle>
          {landingTitle && (
            <SheetDescription className="text-xs truncate">{landingTitle}</SheetDescription>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 px-6 py-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 w-auto self-start">
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="form">
                Formulario
                <span className="ml-1.5 text-xs text-muted-foreground">({enabledCount})</span>
              </TabsTrigger>
              <TabsTrigger value="styles">Estilos</TabsTrigger>
            </TabsList>

            {/* ----------------------------------------------------------------
                TAB: Contenido
            ---------------------------------------------------------------- */}
            <TabsContent value="content" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="headline">Titular principal</Label>
                <Input
                  id="headline"
                  value={content.headline}
                  onChange={(e) => setField('headline', e.target.value)}
                  placeholder="Ej: Obtén tu crédito de libranza hoy"
                />
                <p className="text-xs text-muted-foreground">
                  Encabezado grande que ve el prospecto al abrir la página.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subheadline">Subtítulo</Label>
                <Textarea
                  id="subheadline"
                  value={content.subheadline}
                  onChange={(e) => setField('subheadline', e.target.value)}
                  placeholder="Ej: Diligencia el formulario y un asesor te contactará en menos de 24 horas."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta_text">Texto del botón</Label>
                <Input
                  id="cta_text"
                  value={content.cta_text}
                  onChange={(e) => setField('cta_text', e.target.value)}
                  placeholder="Enviar solicitud"
                />
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-sm font-medium">Mensaje de agradecimiento</p>
                <p className="text-xs text-muted-foreground">
                  Se muestra al prospecto después de enviar el formulario.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ty_title">Título</Label>
                <Input
                  id="ty_title"
                  value={content.thank_you_title}
                  onChange={(e) => setField('thank_you_title', e.target.value)}
                  placeholder="¡Gracias!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ty_message">Mensaje</Label>
                <Textarea
                  id="ty_message"
                  value={content.thank_you_message}
                  onChange={(e) => setField('thank_you_message', e.target.value)}
                  placeholder="Un asesor te contactará pronto."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* ----------------------------------------------------------------
                TAB: Formulario
            ---------------------------------------------------------------- */}
            <TabsContent value="form" className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-4">
                Activa los campos que quieres mostrar en el formulario y ajusta su etiqueta.
                Los campos requeridos bloquean el envío si están vacíos.
              </p>

              {content.fields.map((field) => (
                <div
                  key={field.name}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{field.label}</p>
                      <p className="text-xs text-muted-foreground">{field.name}</p>
                    </div>
                    <Switch
                      checked={field.enabled}
                      onCheckedChange={(v) => updateField(field.name, { enabled: v, required: v ? field.required : false })}
                    />
                  </div>

                  {field.enabled && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs" htmlFor={`label-${field.name}`}>
                          Etiqueta visible
                        </Label>
                        <Input
                          id={`label-${field.name}`}
                          value={field.label}
                          onChange={(e) => updateField(field.name, { label: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id={`req-${field.name}`}
                          checked={field.required}
                          onCheckedChange={(v) => updateField(field.name, { required: v })}
                          className="scale-90"
                        />
                        <Label htmlFor={`req-${field.name}`} className="text-xs font-normal cursor-pointer">
                          Campo requerido
                        </Label>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* ----------------------------------------------------------------
                TAB: Estilos
            ---------------------------------------------------------------- */}
            <TabsContent value="styles" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Color primario</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="primary_color"
                    type="color"
                    value={styles.primary_color}
                    onChange={(e) => setStyle('primary_color', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border p-1"
                  />
                  <Input
                    value={styles.primary_color}
                    onChange={(e) => setStyle('primary_color', e.target.value)}
                    placeholder="#0F172A"
                    className="font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Se aplica al botón y a los elementos destacados de la página.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bg_color">Color de fondo</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="bg_color"
                    type="color"
                    value={styles.background_color}
                    onChange={(e) => setStyle('background_color', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border p-1"
                  />
                  <Input
                    value={styles.background_color}
                    onChange={(e) => setStyle('background_color', e.target.value)}
                    placeholder="#F8FAFC"
                    className="font-mono"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={isLoading || saveMutation.isPending || !landingId}
          >
            {saveMutation.isPending && <Spinner className="mr-2" />}
            Guardar cambios
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
