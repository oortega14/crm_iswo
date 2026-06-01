import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres (igual que en el servidor)'),
    password_confirmation: z.string().min(8, 'Confirma la contraseña'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })

type FormValues = z.infer<typeof schema>

const resetSearchSchema = z.object({
  token: z.string().optional(),
  tenant: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: resetSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const search = Route.useSearch()
  const token = search.token?.trim()
  const tenant = search.tenant?.trim()

  if (!token || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace incompleto</CardTitle>
            <CardDescription>
              Abre el enlace que recibiste por correo. Si ya caducó, solicita uno nuevo en «Olvidé mi
              contraseña».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <ResetPasswordForm token={token} tenantSlug={tenant} />
}

function ResetPasswordForm({ token, tenantSlug }: { token: string; tenantSlug: string }) {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    window.localStorage.setItem('crm-tenant-slug', tenantSlug.toLowerCase())
  }, [tenantSlug])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const slug = tenantSlug.trim().toLowerCase()
      await api.post(
        '/password/reset',
        {
          reset_password_token: token,
          password: data.password,
          password_confirmation: data.password_confirmation,
        },
        { headers: { 'X-Tenant-Slug': slug } },
      )
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada. Ya puedes iniciar sesión.')
      navigate({ to: '/login', search: { tenant: tenantSlug } })
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err))
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>
            Elige una contraseña segura. El enlace caduca según la política del servidor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  {...form.register('password')}
                  aria-invalid={!!form.formState.errors.password}
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
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  {...form.register('password_confirmation')}
                  aria-invalid={!!form.formState.errors.password_confirmation}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {form.formState.errors.password_confirmation && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password_confirmation.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full mt-2" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Guardando…
                </>
              ) : (
                'Guardar contraseña'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                Ir al inicio de sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
