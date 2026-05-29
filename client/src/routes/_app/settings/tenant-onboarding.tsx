import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createAdminClient } from '@/lib/adminApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'

const ADMIN_TOKEN_KEY = 'crm-super-admin-token'

export const Route = createFileRoute('/_app/settings/tenant-onboarding')({
  beforeLoad: ({ context }) => {
    if (context.auth.user?.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: TenantOnboardingPage,
})

type TenantRow = {
  id: number
  slug: string
  name: string
  active: boolean
  created_at: string
}

function TenantOnboardingPage() {
  const queryClient = useQueryClient()
  const [adminToken, setAdminToken] = useState(
    () => window.sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? ''
  )
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const saveToken = () => {
    window.sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken.trim())
    toast.success('Token guardado para esta sesión')
    queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
  }

  const { data: tenants = [], isLoading, isError } = useQuery<TenantRow[]>({
    queryKey: ['admin-tenants', adminToken],
    enabled: adminToken.trim().length > 0,
    queryFn: async () => {
      const client = createAdminClient(adminToken.trim())
      const res = await client.get<{ data: TenantRow[] }>('/admin/tenants')
      return res.data.data ?? []
    },
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const client = createAdminClient(adminToken.trim())
      const res = await client.post<{ data: Record<string, unknown> }>('/admin/tenants', {
        tenant: {
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          admin_email: adminEmail.trim(),
          admin_name: adminName.trim() || 'Administrador',
          admin_password: adminPassword || undefined,
        },
      })
      return res.data.data
    },
    onSuccess: (data) => {
      toast.success(`Tenant "${data.slug}" creado`)
      setSlug('')
      setName('')
      setAdminEmail('')
      setAdminName('')
      setAdminPassword('')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
    },
    onError: () => toast.error('No se pudo crear el tenant. Verifica el token SUPER_ADMIN.'),
  })

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="size-6" />
          Onboarding de tenants
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          RFC §9 — activar un tenant nuevo sin modificar código. Requiere{' '}
          <code className="text-xs bg-muted px-1 rounded">SUPER_ADMIN_TOKEN</code> del API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token super-admin</CardTitle>
          <CardDescription>
            Solo personal ISWO. Se guarda en sessionStorage de este navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            type="password"
            placeholder="Token X-Admin-Token"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="font-mono text-sm"
          />
          <Button variant="secondary" onClick={saveToken}>
            Guardar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4" />
            Nuevo tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Slug (subdominio)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="micasita" />
          </div>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Casita" />
          </div>
          <div className="space-y-1.5">
            <Label>Email admin inicial</Label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@micasita.co"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nombre admin</Label>
            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Contraseña admin (opcional)</Label>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Se genera automáticamente si se deja vacío"
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !adminToken.trim() ||
                !slug.trim() ||
                !name.trim() ||
                !adminEmail.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && <Spinner className="mr-2" />}
              Crear tenant
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenants existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!adminToken.trim() ? (
            <p className="text-sm text-muted-foreground">Ingresa el token para listar tenants.</p>
          ) : isLoading ? (
            <Spinner className="size-6" />
          ) : isError ? (
            <p className="text-sm text-destructive">Token inválido o sin permisos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.slug}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.active ? 'Sí' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
