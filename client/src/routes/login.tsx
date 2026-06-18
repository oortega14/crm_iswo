import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { redirectIfAuthenticated } from '@/lib/authGuards'
import { waitForAuthBootstrap } from '@/lib/authSession'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useMemo, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { TenantLogoMark } from '@/components/brand/TenantLogoMark'
import { resolveTenantBrand } from '@/lib/tenantBrand'
import api, { formatRailsError } from '@/lib/api'
import { clearSessionQueryCache, queryClient } from '@/lib/queryClient'
import {
  buildUserFromSession,
  extractBearerToken,
  hydrateTenantBranding,
  resolveInitialTenant,
  resolveTenantSlug,
  type JsonApiResource,
} from '@/lib/authSession'
import { useAuthStore } from '@/stores/auth'
import { isPlatformTenant, PLATFORM_HOME, PLATFORM_TENANT_SLUG } from '@/lib/platformTenant'
import {
  canPickLoginTenant,
  resolveLoginTenantFromUrl,
  resolveSubmitTenantSlug,
  tenantsFromAmbiguousError,
  type TenantLoginOption,
} from '@/lib/loginTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tenant, User } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  tenantSlug: z.string().optional(),
})

const loginSearchSchema = z.object({
  tenant: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

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

type SessionMeta = {
  tenant?: {
    id?: string | number
    slug?: string
    name?: string
  }
}

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: async () => {
    await waitForAuthBootstrap()
    redirectIfAuthenticated()
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { tenant: tenantFromUrl } = Route.useSearch()
  const [showPassword, setShowPassword] = useState(false)
  const [ambiguousTenants, setAmbiguousTenants] = useState<TenantLoginOption[]>([])
  const [forceTenantPicker, setForceTenantPicker] = useState(false)

  const platformLoginUrl = useMemo(
    () => resolveLoginTenantFromUrl(tenantFromUrl),
    [tenantFromUrl],
  )
  const showTenantPicker = canPickLoginTenant(tenantFromUrl) || forceTenantPicker

  // No arrastrar micasita/iswo de una sesión anterior al login por correo.
  useEffect(() => {
    if (!tenantFromUrl?.trim() && !showTenantPicker) {
      window.localStorage.removeItem('crm-tenant-slug')
    }
  }, [tenantFromUrl, showTenantPicker])

  const loginMutation = useMutation({
    mutationFn: async (payload: {
      email: string
      password: string
      tenantSlug: string
    }): Promise<{ user: User; token: string; tenant: Tenant | null; tenantSlug: string }> => {
      const headers: Record<string, string> = {}
      if (payload.tenantSlug) {
        headers['X-Tenant-Slug'] = payload.tenantSlug
      }

      const response = await api.post(
        '/sessions',
        { user: { email: payload.email, password: payload.password } },
        { headers, timeout: 15_000 },
      )

      const accessToken = extractBearerToken(response)
      const sessionData = response.data?.data as JsonApiResource<SessionAttributes> | undefined
      const sessionMeta = (response.data?.meta || {}) as SessionMeta

      if (!accessToken || !sessionData) {
        throw new Error('Respuesta inválida del servidor al iniciar sesión')
      }

      const user = buildUserFromSession(sessionData)
      const tenantSlug = resolveTenantSlug(payload.tenantSlug, sessionMeta.tenant)

      if (tenantSlug) {
        window.localStorage.setItem('crm-tenant-slug', tenantSlug)
      }

      const tenant = resolveInitialTenant(tenantSlug, sessionMeta.tenant)

      return { user, token: accessToken, tenant, tenantSlug }
    },
    onSuccess: (data) => {
      clearSessionQueryCache(queryClient)
      useAuthStore.getState().restoreSession({
        user: data.user,
        token: data.token,
        tenant: data.tenant,
      })
      toast.success(`Bienvenido, ${data.user.name}`)
      void router.navigate({
        to: isPlatformTenant(data.tenant) ? PLATFORM_HOME : '/',
        replace: true,
      })
      if (data.tenantSlug) {
        hydrateTenantBranding(data.token, data.tenantSlug)
      }
    },
    onError: (error: unknown) => {
      const tenants = tenantsFromAmbiguousError(error)
      if (tenants.length > 0) {
        setAmbiguousTenants(tenants)
        setForceTenantPicker(true)
        toast.error('Selecciona la empresa a la que quieres ingresar.')
        return
      }
      toast.error(formatRailsError(error, 'No se pudo iniciar sesión. Revisa email y contraseña.'))
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: platformLoginUrl || PLATFORM_TENANT_SLUG,
    },
  })

  const onSubmit = (data: LoginForm) => {
    const tenantSlug = resolveSubmitTenantSlug({
      showTenantPicker,
      formTenant: data.tenantSlug,
    })

    loginMutation.mutate({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      tenantSlug,
    })
  }

  const tenantForForgot = showTenantPicker
    ? watch('tenantSlug')?.trim().toLowerCase()
    : ''

  const watchedTenantSlug = watch('tenantSlug')
  const previewSlug = (
    platformLoginUrl ||
    (showTenantPicker ? watchedTenantSlug : tenantFromUrl) ||
    'iswo'
  )
    ?.trim()
    .toLowerCase()
  const previewBrand = resolveTenantBrand(previewSlug)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {previewBrand && (
          <div
            className="h-1 w-full"
            style={{
              backgroundImage: `linear-gradient(90deg, ${previewBrand.primary}, ${previewBrand.gradientTo})`,
            }}
            aria-hidden
          />
        )}
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <TenantLogoMark slug={previewSlug} size="lg" showLabel />
          </div>
          <CardTitle className="text-2xl">
            {previewBrand?.label ?? import.meta.env.VITE_APP_NAME ?? 'CRM ISWO'}
          </CardTitle>
          <CardDescription>
            {showTenantPicker
              ? previewBrand
                ? `Acceso a ${previewBrand.label} — ingresa tus credenciales`
                : 'Plataforma ISWO — elige la empresa a la que ingresar'
              : 'Ingresa con tu correo y contraseña; detectamos tu empresa automáticamente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {showTenantPicker && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="tenantSlug">Empresa</Label>
                {ambiguousTenants.length > 0 ? (
                  <Select
                    value={watch('tenantSlug') || undefined}
                    onValueChange={(v) => setValue('tenantSlug', v)}
                  >
                    <SelectTrigger id="tenantSlug">
                      <SelectValue placeholder="Selecciona tu empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {ambiguousTenants.map((t) => (
                        <SelectItem key={t.slug} value={t.slug}>
                          {t.name} ({t.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="tenantSlug"
                    type="text"
                    placeholder="super-admin, iswo, micasita…"
                    autoComplete="organization"
                    {...register('tenantSlug')}
                  />
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  className="pr-10"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
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

            {!showTenantPicker && (
              <p className="text-center text-xs text-muted-foreground">
                ¿Operador de plataforma?{' '}
                <Link
                  to="/login"
                  search={{ tenant: PLATFORM_TENANT_SLUG }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Acceso super-admin
                </Link>
              </p>
            )}

            <p className="text-center text-sm">
              <Link
                to="/forgot-password"
                search={tenantForForgot ? { tenant: tenantForForgot } : undefined}
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
