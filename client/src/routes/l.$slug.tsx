import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'

// ---------------------------------------------------------------------------
// Ruta
// ---------------------------------------------------------------------------

const utmSearchSchema = z.object({
  utm_source:   z.string().optional(),
  utm_medium:   z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term:     z.string().optional(),
  utm_content:  z.string().optional(),
  // En local no hay subdominio; se puede forzar el tenant con ?tenant=micasita
  tenant:       z.string().optional(),
})

export const Route = createFileRoute('/l/$slug')({
  validateSearch: utmSearchSchema,
  component: PublicLandingPage,
})

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'tel' | 'email' | 'textarea'
  enabled: boolean
  required: boolean
}

interface LandingContent {
  headline?: string
  subheadline?: string
  cta_text?: string
  thank_you_title?: string
  thank_you_message?: string
  fields?: FieldConfig[]
  gjs_html?: string
  gjs_css?: string
}

interface LandingStyles {
  primary_color?: string
  background_color?: string
}

interface PublicLanding {
  id: number
  title: string
  slug: string
  seo_title?: string
  seo_description?: string
  content: LandingContent
  styles: LandingStyles
}

// ---------------------------------------------------------------------------
// Campos por defecto si la landing no tiene configuración guardada
// ---------------------------------------------------------------------------

const DEFAULT_FIELDS: FieldConfig[] = [
  { name: 'first_name', label: 'Nombre',            type: 'text',  enabled: true,  required: true  },
  { name: 'last_name',  label: 'Apellido',           type: 'text',  enabled: true,  required: true  },
  { name: 'phone',      label: 'Teléfono',           type: 'tel',   enabled: true,  required: true  },
  { name: 'email',      label: 'Correo electrónico', type: 'email', enabled: true,  required: false },
]

// ---------------------------------------------------------------------------
// Construcción dinámica del schema Zod según los campos activos
// ---------------------------------------------------------------------------

function buildSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of fields) {
    if (!f.enabled) continue
    let rule: z.ZodString = z.string()
    if (f.type === 'email') rule = rule.email('Correo inválido')
    if (f.required) {
      rule = rule.min(1, `${f.label} es obligatorio`)
    } else {
      rule = rule.optional() as unknown as z.ZodString
    }
    shape[f.name] = rule
  }
  return z.object(shape)
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

function PublicLandingPage() {
  const { slug } = Route.useParams()
  const searchParams = useSearch({ from: '/l/$slug' })
  const { tenant: tenantParam, ...utmParams } = searchParams
  const [submitted, setSubmitted] = useState(false)

  // En producción el tenant se resuelve por subdominio.
  // En local se puede pasar ?tenant=micasita como fallback.
  const tenantHeaders: Record<string, string> = tenantParam ? { 'X-Tenant-Slug': tenantParam } : {}

  // Fetch de la landing pública (sin autenticación)
  const { data: landing, isLoading, isError } = useQuery<PublicLanding>({
    queryKey: ['public-landing', slug, tenantParam],
    queryFn: async () => {
      const res = await api.get(`/public/landings/${slug}`, { headers: tenantHeaders })
      return res.data.data as PublicLanding
    },
    retry: false,
  })

  if (isLoading) return <LoadingScreen />
  if (isError || !landing) return <NotFoundScreen />

  const content  = landing.content  ?? {}
  const styles   = landing.styles   ?? {}
  const fields   = content.fields?.filter((f) => f.enabled) ?? DEFAULT_FIELDS

  const primaryColor  = styles.primary_color    || '#0F172A'
  const bgColor       = styles.background_color || '#F8FAFC'
  const headline      = content.headline      || landing.title
  const subheadline   = content.subheadline   || ''
  const ctaText       = content.cta_text      || 'Enviar solicitud'
  const tyTitle       = content.thank_you_title   || '¡Gracias!'
  const tyMessage     = content.thank_you_message || 'Un asesor te contactará pronto.'
  const gjsHtml       = content.gjs_html || ''
  const gjsCss        = content.gjs_css  || ''

  if (submitted) {
    return (
      <ThankYouScreen
        title={tyTitle}
        message={tyMessage}
        primaryColor={primaryColor}
        bgColor={bgColor}
      />
    )
  }

  const form = (
    <LandingForm
      slug={slug}
      fields={fields}
      ctaText={ctaText}
      primaryColor={primaryColor}
      utmParams={utmParams}
      tenantHeaders={tenantHeaders}
      onSuccess={() => setSubmitted(true)}
    />
  )

  // Si hay diseño GrapeJS: hero visual a la izquierda, formulario a la derecha
  if (gjsHtml) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: bgColor }}>
        {/* Panel izquierdo — diseño GrapeJS */}
        <div className="lg:w-1/2 overflow-auto">
          <style>{gjsCss}</style>
          <div dangerouslySetInnerHTML={{ __html: gjsHtml }} />
        </div>

        {/* Panel derecho — formulario React */}
        <div className="lg:w-1/2 flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md">{form}</div>
        </div>
      </div>
    )
  }

  return (
    <LandingLayout
      headline={headline}
      subheadline={subheadline}
      primaryColor={primaryColor}
      bgColor={bgColor}
    >
      {form}
    </LandingLayout>
  )
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function LandingLayout({
  headline,
  subheadline,
  primaryColor,
  bgColor,
  children,
}: {
  headline: string
  subheadline: string
  primaryColor: string
  bgColor: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: bgColor }}>
      {/* Panel izquierdo — hero */}
      <div
        className="lg:w-1/2 flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-24"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-md">
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-6">
              <span className="text-white font-bold text-lg">I</span>
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
            {headline}
          </h1>
          {subheadline && (
            <p className="text-white/75 text-base lg:text-lg leading-relaxed">
              {subheadline}
            </p>
          )}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="lg:w-1/2 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

function LandingForm({
  slug,
  fields,
  ctaText,
  primaryColor,
  utmParams,
  tenantHeaders,
  onSuccess,
}: {
  slug: string
  fields: FieldConfig[]
  ctaText: string
  primaryColor: string
  utmParams: Omit<z.infer<typeof utmSearchSchema>, 'tenant'>
  tenantHeaders: Record<string, string>
  onSuccess: () => void
}) {
  const schema = buildSchema(fields)
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const submitMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      await api.post(`/public/landings/${slug}/submit`, {
        payload: data,
        ...utmParams,
      }, { headers: tenantHeaders })
    },
    onSuccess,
  })

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Completa el formulario</h2>
      <p className="text-sm text-gray-500 mb-6">
        Un asesor te contactará a la brevedad.
      </p>

      <form onSubmit={handleSubmit((data) => submitMutation.mutate(data))} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>

            {field.type === 'textarea' ? (
              <Textarea
                id={field.name}
                rows={3}
                placeholder={field.label}
                className="resize-none"
                {...register(field.name)}
              />
            ) : (
              <Input
                id={field.name}
                type={field.type}
                placeholder={field.label}
                {...register(field.name)}
              />
            )}

            {errors[field.name] && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String((errors[field.name] as { message?: string })?.message ?? '')}
              </p>
            )}
          </div>
        ))}

        {submitMutation.isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Ocurrió un error al enviar. Intenta de nuevo.
          </div>
        )}

        <Button
          type="submit"
          className="w-full mt-2 text-white font-medium"
          style={{ backgroundColor: primaryColor }}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
          ) : (
            ctaText
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        Tu información está protegida y no será compartida.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pantalla de gracias
// ---------------------------------------------------------------------------

function ThankYouScreen({
  title,
  message,
  primaryColor,
  bgColor,
}: {
  title: string
  message: string
  primaryColor: string
  bgColor: string
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: bgColor }}
    >
      <div className="text-center max-w-sm">
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: primaryColor }}
        >
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pantallas de estado
// ---------------------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <p className="text-5xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Página no encontrada</h1>
        <p className="text-gray-500 text-sm">
          Esta página no existe o ya no está disponible.
        </p>
      </div>
    </div>
  )
}
