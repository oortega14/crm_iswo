import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import api, { formatRailsError } from '@/lib/api'
import {
  canPickLoginTenant,
  resolveLoginTenantFromUrl,
  resolveSubmitTenantSlug,
  tenantsFromAmbiguousError,
  type TenantLoginOption,
} from '@/lib/loginTenant'
import { PLATFORM_TENANT_SLUG } from '@/lib/platformTenant'
import { redirectIfAuthenticated } from '@/lib/authGuards'
import { waitForAuthBootstrap } from '@/lib/authSession'
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

const forgotSearchSchema = z.object({
  tenant: z.string().optional(),
})

export const Route = createFileRoute('/forgot-password')({
  validateSearch: forgotSearchSchema,
  beforeLoad: async () => {
    await waitForAuthBootstrap()
    redirectIfAuthenticated()
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { tenant: tenantFromUrl } = Route.useSearch()
  const [ambiguousTenants, setAmbiguousTenants] = useState<TenantLoginOption[]>([])
  const [forceTenantPicker, setForceTenantPicker] = useState(false)

  const showTenantPicker = canPickLoginTenant(tenantFromUrl) || forceTenantPicker

  const schema = z.object({
    tenantSlug: showTenantPicker
      ? z.string().min(1, 'Indica la empresa')
      : z.string().optional(),
    email: z.string().email('Correo electrónico inválido'),
  })

  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantSlug: resolveLoginTenantFromUrl(tenantFromUrl) || PLATFORM_TENANT_SLUG,
      email: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const slug = resolveSubmitTenantSlug({
        showTenantPicker,
        formTenant: data.tenantSlug,
      })
      const headers: Record<string, string> = {}
      if (slug) {
        headers['X-Tenant-Slug'] = slug
        window.localStorage.setItem('crm-tenant-slug', slug)
      }
      await api.post(
        '/password/forgot',
        { email: data.email.trim().toLowerCase() },
        { headers },
      )
    },
    onSuccess: () => {
      toast.success(
        'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.',
      )
      navigate({ to: '/login' })
    },
    onError: (err: unknown) => {
      const tenants = tenantsFromAmbiguousError(err)
      if (tenants.length > 0) {
        setAmbiguousTenants(tenants)
        setForceTenantPicker(true)
        toast.error('Selecciona la empresa asociada a tu correo.')
        return
      }
      toast.error(formatRailsError(err, 'No se pudo enviar el correo de recuperación.'))
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>
            {showTenantPicker
              ? 'Indica empresa y correo (operadores de plataforma).'
              : 'Te enviaremos un enlace si el correo está registrado en tu empresa.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="flex flex-col gap-4"
          >
            {showTenantPicker && (
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Empresa</Label>
                {ambiguousTenants.length > 0 ? (
                  <Select
                    value={form.watch('tenantSlug') || undefined}
                    onValueChange={(v) => form.setValue('tenantSlug', v)}
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
                  <Input id="tenantSlug" {...form.register('tenantSlug')} />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="mr-2" />}
              Enviar enlace
            </Button>
            <Button asChild variant="ghost" type="button">
              <Link to="/login" search={tenantFromUrl ? { tenant: tenantFromUrl } : undefined}>
                Volver al login
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
