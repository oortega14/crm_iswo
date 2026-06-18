import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatAdminApiError, adminPlatformHeaders } from '@/lib/adminApi'
import api from '@/lib/api'
import { PLATFORM_TENANT_SLUG, isPlatformTenant } from '@/lib/platformTenant'
import { requirePlatformAdmin } from '@/lib/platformRouteGuard'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'

const VERTICAL_OPTIONS = [
  { value: 'auto', label: 'Automático (detectar por slug)' },
  { value: 'iswo', label: 'ISWO — Consultoría ISO' },
  { value: 'micasita', label: 'Mi Casita — Inmobiliaria' },
  { value: 'libranzas', label: 'Libranzas — Crédito nómina' },
  { value: 'generic', label: 'Genérico — pipeline estándar' },
] as const

export const Route = createFileRoute('/_app/settings/tenant-onboarding')({
  beforeLoad: () => {
    requirePlatformAdmin()
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

type CreateSuccess = {
  slug: string
  name: string
  adminEmail: string
  generatedPassword: string | null
  passwordGenerated: boolean
}

function TenantOnboardingPage() {
  const queryClient = useQueryClient()
  const tenant = useAuthStore((s) => s.tenant)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const canManageTenants = isAuthenticated && isPlatformTenant(tenant)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [vertical, setVertical] = useState<string>('auto')
  const [createSuccess, setCreateSuccess] = useState<CreateSuccess | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const { data: tenants = [], isLoading, isError, error: listError } = useQuery<TenantRow[]>({
    queryKey: ['admin-tenants', PLATFORM_TENANT_SLUG],
    enabled: canManageTenants,
    queryFn: async () => {
      const res = await api.get<{ data: TenantRow[] }>('/admin/tenants', {
        headers: adminPlatformHeaders(),
      })
      return res.data.data ?? []
    },
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: Record<string, unknown> }>(
        '/admin/tenants',
        {
          tenant: {
            slug: slug.trim().toLowerCase(),
            name: name.trim(),
            admin_email: adminEmail.trim(),
            admin_name: adminName.trim() || 'Administrador',
            admin_password: adminPassword || undefined,
            ...(vertical !== 'auto' ? { vertical } : {}),
          },
        },
        { headers: adminPlatformHeaders() },
      )
      return res.data.data
    },
    onSuccess: (data) => {
      setCreateSuccess({
        slug: String(data.slug ?? ''),
        name: String(data.name ?? ''),
        adminEmail: String(data.admin_email ?? ''),
        generatedPassword:
          data.generated_admin_password != null
            ? String(data.generated_admin_password)
            : null,
        passwordGenerated: Boolean(data.password_generated),
      })
      toast.success(`Tenant "${data.slug}" creado`)
      setSlug('')
      setName('')
      setAdminEmail('')
      setAdminName('')
      setAdminPassword('')
      setVertical('auto')
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
    },
    onError: (err: unknown) => {
      toast.error(formatAdminApiError(err, 'No se pudo crear el tenant. Revisa slug y email.'))
    },
  })

  const updateActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await api.patch<{ data: TenantRow }>(
        `/admin/tenants/${id}`,
        { tenant: { active } },
        { headers: adminPlatformHeaders() },
      )
      return res.data.data
    },
    onMutate: ({ id }) => {
      setTogglingId(id)
    },
    onSuccess: (data) => {
      queryClient.setQueryData<TenantRow[]>(['admin-tenants'], (prev) =>
        (prev ?? []).map((t) => (t.id === data.id ? { ...t, active: data.active } : t)),
      )
      toast.success(data.active ? `Tenant "${data.slug}" activado` : `Tenant "${data.slug}" desactivado`)
    },
    onError: (err: unknown) => {
      toast.error(formatAdminApiError(err, 'No se pudo actualizar el estado del tenant.'))
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
    },
    onSettled: () => {
      setTogglingId(null)
    },
  })

  const loginUrl = createSuccess
    ? `${window.location.origin}/login?tenant=${encodeURIComponent(createSuccess.slug)}`
    : ''

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copiado`)
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="size-6" />
          Onboarding de tenants
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Solo administradores del tenant plataforma <strong>{PLATFORM_TENANT_SLUG}</strong>.
          Usa tu sesión activa; no se requiere token adicional.
        </p>
      </div>

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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Plantilla vertical (RFC F5)</Label>
            <Select value={vertical} onValueChange={setVertical}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona plantilla" />
              </SelectTrigger>
              <SelectContent>
                {VERTICAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define pipeline, BANT, fuentes de lead y campos custom. Con &quot;Automático&quot;, se usa el slug
              (iswo, micasita, libranzas) si coincide.
            </p>
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
          {isLoading ? (
            <Spinner className="size-6" />
          ) : isError ? (
            <p className="text-sm text-destructive">
              {formatAdminApiError(listError, 'No se pudo cargar el listado de tenants.')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[100px]">Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => {
                  const isPlatform = t.slug === PLATFORM_TENANT_SLUG
                  const isToggling = togglingId === t.id
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm">{t.slug}</TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={t.active}
                            disabled={isPlatform || isToggling || updateActiveMutation.isPending}
                            onCheckedChange={(checked) =>
                              updateActiveMutation.mutate({ id: t.id, active: checked })
                            }
                            aria-label={`${t.active ? 'Desactivar' : 'Activar'} ${t.slug}`}
                          />
                          {isToggling && <Spinner className="size-4" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createSuccess != null} onOpenChange={(open) => !open && setCreateSuccess(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tenant creado</DialogTitle>
            <DialogDescription>
              Guarda las credenciales del administrador inicial. La contraseña generada solo se muestra
              una vez.
            </DialogDescription>
          </DialogHeader>
          {createSuccess && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Empresa</p>
                <p className="font-medium">
                  {createSuccess.name}{' '}
                  <span className="font-mono text-muted-foreground">({createSuccess.slug})</span>
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Email admin</p>
                  <p className="font-mono truncate">{createSuccess.adminEmail}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => copyText('Email', createSuccess.adminEmail)}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              {createSuccess.passwordGenerated && createSuccess.generatedPassword && (
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 p-3">
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Contraseña generada</p>
                    <p className="font-mono break-all">{createSuccess.generatedPassword}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => copyText('Contraseña', createSuccess.generatedPassword!)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-muted-foreground">URL de login</p>
                  <p className="font-mono text-xs break-all">{loginUrl}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => copyText('URL', loginUrl)}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setCreateSuccess(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
