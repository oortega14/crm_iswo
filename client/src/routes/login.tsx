import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import type { Tenant, User } from '@/types'

const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'El identificador de empresa es obligatorio'),
  email:      z.string().email('Correo electrónico inválido'),
  password:   z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

const loginSearchSchema = z.object({
  tenant: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

type JsonApiResource<TAttributes> = {
  id: string
  attributes: TAttributes
}

type SessionAttributes = {
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  role: User['role']
  avatar_url?: string | null
  active?: boolean
  last_sign_in_at?: string
  created_at?: string
  updated_at?: string
}

type TenantAttributes = {
  name: string
  slug: string
  logo_url?: string | null
  brand_color?: string
  currency?: string
  timezone?: string
  created_at?: string
}

type SessionMeta = {
  tenant?: {
    id?: string | number
    slug?: string
  }
}

const buildUserFromSession = (resource: JsonApiResource<SessionAttributes>): User => {
  const attrs = resource.attributes
  const fullName = attrs.full_name || [attrs.first_name, attrs.last_name].filter(Boolean).join(' ')
  const timestamp = new Date().toISOString()

  return {
    id: resource.id,
    email: attrs.email,
    name: fullName || attrs.email,
    role: attrs.role,
    avatar_url: attrs.avatar_url || undefined,
    active: attrs.active ?? true,
    last_sign_in_at: attrs.last_sign_in_at,
    created_at: attrs.created_at || timestamp,
    updated_at: attrs.updated_at || timestamp,
  }
}

const buildTenant = (resource: JsonApiResource<TenantAttributes>): Tenant => {
  const attrs = resource.attributes
  return {
    id: resource.id,
    name: attrs.name,
    subdomain: attrs.slug,
    logo_url: attrs.logo_url || undefined,
    primary_color: attrs.brand_color || '#2563eb',
    currency: attrs.currency || 'COP',
    timezone: attrs.timezone || 'America/Bogota',
    created_at: attrs.created_at || new Date().toISOString(),
  }
}

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

const ENV_TENANT = import.meta.env.VITE_TENANT_SLUG as string | undefined

function resolveInitialTenant(fromUrl?: string): string {
  if (ENV_TENANT?.trim()) return ENV_TENANT.trim().toLowerCase()
  if (fromUrl?.trim()) return fromUrl.trim().toLowerCase()
  return window.localStorage.getItem('crm-tenant-slug')?.trim().toLowerCase() ?? ''
}

function LoginPage() {
  const navigate = useNavigate()
  const { tenant: tenantFromUrl } = Route.useSearch()
  const login = useAuthStore((s) => s.login)
  const setTenant = useAuthStore((s) => s.setTenant)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm): Promise<{ user: User; token: string }> => {
      const tenantSlug = data.tenantSlug.trim().toLowerCase()
      window.localStorage.setItem('crm-tenant-slug', tenantSlug)
      const response = await api.post('/sessions', {
        user: {
          email: data.email,
          password: data.password,
        },
      })

      const authHeader = response.headers.authorization as string | undefined
      const accessToken = authHeader?.replace(/^Bearer\s+/i, '').trim()
      const sessionData = response.data?.data as JsonApiResource<SessionAttributes> | undefined
      const sessionMeta = (response.data?.meta || {}) as SessionMeta

      if (!accessToken || !sessionData) {
        throw new Error('Respuesta inválida del servidor al iniciar sesión')
      }

      const user = buildUserFromSession(sessionData)
      setAccessToken(accessToken)
      try {
        const tenantResponse = await api.get('/tenant')
        const tenantData = tenantResponse.data?.data as JsonApiResource<TenantAttributes> | undefined
        if (tenantData) {
          setTenant(buildTenant(tenantData))
        } else if (sessionMeta.tenant?.slug) {
          setTenant({
            id: String(sessionMeta.tenant.id || '0'),
            name: sessionMeta.tenant.slug,
            subdomain: sessionMeta.tenant.slug,
            primary_color: '#2563eb',
            currency: 'COP',
            timezone: 'America/Bogota',
            created_at: new Date().toISOString(),
          })
        }
      } catch {
        if (sessionMeta.tenant?.slug) {
          setTenant({
            id: String(sessionMeta.tenant.id || '0'),
            name: sessionMeta.tenant.slug,
            subdomain: sessionMeta.tenant.slug,
            primary_color: '#2563eb',
            currency: 'COP',
            timezone: 'America/Bogota',
            created_at: new Date().toISOString(),
          })
        }
      }

      return { user, token: accessToken }
    },
    onSuccess: (data) => {
      login(data.user, data.token)
      toast.success(`Bienvenido, ${data.user.name}`)
      navigate({ to: '/' })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: resolveInitialTenant(tenantFromUrl) },
  })

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            IS
          </div>
          <CardTitle className="text-2xl">CRM ISWO</CardTitle>
          <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Campo de tenant: visible solo cuando no está fijado por variable de entorno */}
            {!ENV_TENANT && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="tenantSlug">Empresa (identificador)</Label>
                <Input
                  id="tenantSlug"
                  type="text"
                  placeholder="iswo"
                  autoComplete="organization"
                  {...register('tenantSlug')}
                  aria-invalid={!!errors.tenantSlug}
                />
                {errors.tenantSlug && (
                  <p className="text-sm text-destructive">{errors.tenantSlug.message}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                autoComplete="email"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tu contraseña"
                autoComplete="current-password"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>

            <p className="text-center text-sm">
              <Link
                to="/forgot-password"
                className="text-primary underline-offset-4 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
