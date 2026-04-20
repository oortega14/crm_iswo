import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import type { Tenant, User } from '@/types'

// Demo users for testing
const DEMO_USERS: Record<string, { user: User; password: string }> = {
  'admin@iswo.com': {
    password: 'admin123',
    user: {
      id: '1',
      name: 'Admin Demo',
      email: 'admin@iswo.com',
      role: 'admin',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  'manager@iswo.com': {
    password: 'manager123',
    user: {
      id: '2',
      name: 'Manager Demo',
      email: 'manager@iswo.com',
      role: 'manager',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  'consultant@iswo.com': {
    password: 'consultant123',
    user: {
      id: '3',
      name: 'Consultant Demo',
      email: 'consultant@iswo.com',
      role: 'consultant',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
}

const DEMO_TENANT: Tenant = {
  id: '1',
  name: 'ISWO Demo',
  subdomain: 'demo',
  logo_url: null,
  primary_color: '#2563eb',
  plan: 'professional',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const setTenant = useAuthStore((s) => s.setTenant)

  // Demo login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm): Promise<{ user: User; token: string }> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const demoUser = DEMO_USERS[data.email.toLowerCase()]
      if (!demoUser || demoUser.password !== data.password) {
        throw new Error('Credenciales inválidas. Usa admin@iswo.com / admin123')
      }
      
      return {
        user: demoUser.user,
        token: 'demo-token-' + Date.now(),
      }
    },
    onSuccess: (data) => {
      setTenant(DEMO_TENANT)
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@iswo.com"
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
                placeholder="admin123"
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
          </form>

          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Usuarios de prueba:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><strong>Admin:</strong> admin@iswo.com / admin123</li>
              <li><strong>Manager:</strong> manager@iswo.com / manager123</li>
              <li><strong>Consultant:</strong> consultant@iswo.com / consultant123</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
