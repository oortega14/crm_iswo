import { useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import api, { formatRailsError } from '@/lib/api'
import { landingUtmSearchSchema, resolvePublicLandingTenant } from '@/lib/landingSearch'
import { sanitizeLandingCss, stripLandingFormElements } from '@/lib/sanitizeLanding'

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
  og_image_url?: string
  content: LandingContent
  styles: LandingStyles
}

const DEFAULT_FIELDS: FieldConfig[] = [
  { name: 'first_name', label: 'Nombre',            type: 'text',  enabled: true,  required: true  },
  { name: 'last_name',  label: 'Apellido',           type: 'text',  enabled: true,  required: true  },
  { name: 'phone',      label: 'Teléfono',           type: 'tel',   enabled: true,  required: true  },
  { name: 'email',      label: 'Correo electrónico', type: 'email', enabled: true,  required: false },
]

function buildSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of fields) {
    if (!f.enabled) continue
    if (f.required) {
      shape[f.name] =
        f.type === 'email'
          ? z.string().email('Correo inválido').min(1, `${f.label} es obligatorio`)
          : z.string().min(1, `${f.label} es obligatorio`)
    } else {
      shape[f.name] =
        f.type === 'email'
          ? z.string().email('Correo inválido').or(z.literal(''))
          : z.string().optional().default('')
    }
  }
  return z.object(shape)
}

interface PublicLandingPageProps {
  slug: string
}

export function PublicLandingPage({ slug }: PublicLandingPageProps) {
  const searchParams = useSearch({ strict: false }) as z.infer<typeof landingUtmSearchSchema>
  const parsed = landingUtmSearchSchema.safeParse(searchParams)
  const { tenant: tenantParam, ...utmParams } = parsed.success ? parsed.data : { tenant: undefined }
  const tenantSlug = resolvePublicLandingTenant(tenantParam)
  const [submitted, setSubmitted] = useState(false)
  const [createdOpportunityId, setCreatedOpportunityId] = useState<string | undefined>()

  const tenantHeaders: Record<string, string> = tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}

  const { data: landing, isLoading, isError } = useQuery<PublicLanding>({
    queryKey: ['public-landing', slug, tenantSlug],
    queryFn: async () => {
      const res = await api.get(`/public/landings/${slug}`, { headers: tenantHeaders })
      return res.data.data as PublicLanding
    },
    retry: false,
    enabled: !!tenantSlug,
  })

  if (!tenantSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-700 mb-2">Tenant no identificado</h1>
          <p className="text-gray-500 text-sm">
            Abre esta landing en{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">{'{tenant}'}.localhost:3001/{slug}</code>
            {' '}o usa{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">/l/{slug}?tenant=micasita</code>
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) return <LoadingScreen />
  if (isError || !landing) return <NotFoundScreen />

  return (
    <PublicLandingBody
      landing={landing}
      slug={slug}
      submitted={submitted}
      createdOpportunityId={createdOpportunityId}
      onSubmitted={(opportunityId) => {
        setCreatedOpportunityId(opportunityId)
        setSubmitted(true)
      }}
      utmParams={utmParams}
      tenantHeaders={tenantHeaders}
    />
  )
}

function PublicLandingBody({
  landing,
  slug,
  submitted,
  createdOpportunityId,
  onSubmitted,
  utmParams,
  tenantHeaders,
}: {
  landing: PublicLanding
  slug: string
  submitted: boolean
  createdOpportunityId?: string
  onSubmitted: (opportunityId?: string) => void
  utmParams: Omit<z.infer<typeof landingUtmSearchSchema>, 'tenant'>
  tenantHeaders: Record<string, string>
}) {
  const content = landing.content ?? {}
  const styles = landing.styles ?? {}
  const configuredFields = content.fields?.filter((f) => f.enabled) ?? []
  const fields = configuredFields.length > 0 ? configuredFields : DEFAULT_FIELDS

  const primaryColor = styles.primary_color || '#0F172A'
  const bgColor = styles.background_color || '#F8FAFC'
  const headline = content.headline || landing.title
  const subheadline = content.subheadline || ''
  const ctaText = content.cta_text || 'Enviar solicitud'
  const tyTitle = content.thank_you_title || '¡Gracias!'
  const tyMessage = content.thank_you_message || 'Un asesor te contactará pronto.'
  const gjsHtml = content.gjs_html?.trim() ?? ''
  const useGrapeJs = gjsHtml.length > 0

  useEffect(() => {
    document.title = landing.seo_title?.trim() || landing.title
    const desc = landing.seo_description?.trim()
    let meta = document.querySelector('meta[name="description"]')
    if (desc) {
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', desc)
    }
    return () => {
      document.title = 'CRM ISWO'
    }
  }, [landing.id, landing.title, landing.seo_title, landing.seo_description])

  if (submitted) {
    return (
      <ThankYouScreen
        title={tyTitle}
        message={tyMessage}
        primaryColor={primaryColor}
        bgColor={bgColor}
        opportunityId={createdOpportunityId}
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
      onSuccess={(opportunityId) => onSubmitted(opportunityId)}
    />
  )

  const displayHtml = stripLandingFormElements(gjsHtml)

  if (useGrapeJs) {
    return (
      <GrapeJsPublicShell html={displayHtml} css={content.gjs_css ?? ''} bgColor={bgColor}>
        {form}
      </GrapeJsPublicShell>
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

/** Renderiza HTML/CSS de GrapeJS (sanitizado) + formulario CRM conectado al submit público. */
function GrapeJsPublicShell({
  html,
  css,
  bgColor,
  children,
}: {
  html: string
  css: string
  bgColor: string
  children: React.ReactNode
}) {
  const safeHtml = stripLandingFormElements(html)
  const safeCss = sanitizeLandingCss(css)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
      {safeCss ? (
        <style dangerouslySetInnerHTML={{ __html: safeCss }} />
      ) : null}
      <div
        className="flex-1 w-full overflow-x-hidden"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      <div className="border-t bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-4 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-md space-y-2">
          <p className="text-center text-sm font-medium text-gray-900">Formulario de contacto</p>
          <p className="text-center text-xs text-gray-500">
            Al enviar, tu solicitud se registra como oportunidad en el CRM.
          </p>
          {children}
        </div>
      </div>
    </div>
  )
}

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

      <div className="lg:w-1/2 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}

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
  utmParams: Omit<z.infer<typeof landingUtmSearchSchema>, 'tenant'>
  tenantHeaders: Record<string, string>
  onSuccess: (opportunityId?: string) => void
}) {
  const schema = buildSchema(fields)
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const submitMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      try {
        const res = await api.post(`/public/landings/${slug}/submit`, {
          payload: data,
          ...utmParams,
        }, { headers: tenantHeaders })
        const payload = res.data?.data as {
          opportunity_id?: number | string
          contact_id?: number | string
        } | undefined
        if (!payload?.opportunity_id) {
          const msg = (res.data as { message?: string })?.message
          throw new Error(msg || 'No se creó la oportunidad en el CRM')
        }
        return payload
      } catch (err: unknown) {
        throw new Error(formatRailsError(err, 'No se pudo registrar el lead en el CRM'))
      }
    },
    onSuccess: (data) => {
      reset()
      const oid = data?.opportunity_id != null ? String(data.opportunity_id) : undefined
      onSuccess(oid)
    },
  })

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Completa el formulario</h2>
      <p className="text-sm text-gray-500 mb-6">Un asesor te contactará a la brevedad.</p>

      <form onSubmit={handleSubmit((data) => submitMutation.mutate(data))} className="space-y-4" autoComplete="off">
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
            {submitMutation.error instanceof Error
              ? submitMutation.error.message
              : 'Ocurrió un error al enviar. Intenta de nuevo.'}
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

function ThankYouScreen({
  title,
  message,
  primaryColor,
  bgColor,
  opportunityId,
}: {
  title: string
  message: string
  primaryColor: string
  bgColor: string
  opportunityId?: string
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
        {opportunityId && (
          <p className="mt-4 text-xs text-gray-500">
            Referencia: oportunidad #{opportunityId}
          </p>
        )}
      </div>
    </div>
  )
}

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
