import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import api, { formatRailsError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

const schema = z.object({
  tenantSlug: z.string().min(1, 'Indica el identificador del espacio de trabajo (tenant)'),
  email: z.string().email('Correo electrónico inválido'),
})

type FormValues = z.infer<typeof schema>

const forgotSearchSchema = z.object({
  tenant: z.string().optional(),
})

export const Route = createFileRoute('/forgot-password')({
  validateSearch: forgotSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { tenant: tenantFromUrl } = Route.useSearch()

  const defaultTenant =
    tenantFromUrl?.trim().toLowerCase() ||
    (typeof window !== 'undefined'
      ? window.localStorage.getItem('crm-tenant-slug')?.trim().toLowerCase() ?? ''
      : '') ||
    import.meta.env.VITE_TENANT_SLUG?.trim().toLowerCase() ||
    ''

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantSlug: defaultTenant,
      email: '',
    },
  })

  useEffect(() => {
    if (tenantFromUrl?.trim()) {
      const s = tenantFromUrl.trim().toLowerCase()
      window.localStorage.setItem('crm-tenant-slug', s)
      form.setValue('tenantSlug', s)
    }
  }, [tenantFromUrl, form])

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const slug = data.tenantSlug.trim().toLowerCase()
      window.localStorage.setItem('crm-tenant-slug', slug)
      await api.post(
        '/password/forgot',
        { email: data.email.trim().toLowerCase() },
        { headers: { 'X-Tenant-Slug': slug } },
      )
    },
    onSuccess: () => {
      toast.success(
        'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.'
      )
      navigate({ to: '/login' })
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err))
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Indica el identificador de empresa y tu correo. Si la cuenta existe,
            recibirás un enlace por email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="tenantSlug">Empresa (identificador)</Label>
              <Input
                id="tenantSlug"
                autoComplete="organization"
                placeholder="p. ej. iswo, mi-casita, libranzas…"
                {...form.register('tenantSlug')}
                aria-invalid={!!form.formState.errors.tenantSlug}
              />
              {form.formState.errors.tenantSlug && (
                <p className="text-sm text-destructive">{form.formState.errors.tenantSlug.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@empresa.com"
                {...form.register('email')}
                aria-invalid={!!form.formState.errors.email}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full mt-2" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Enviando…
                </>
              ) : (
                'Enviar enlace'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
