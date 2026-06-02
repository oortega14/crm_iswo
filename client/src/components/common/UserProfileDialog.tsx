import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import api, { formatRailsError } from '@/lib/api'
import { getInitials } from '@/lib/utils'
import type { User } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  admin:      'Administrador',
  manager:    'Manager',
  consultant: 'Consultor',
  viewer:     'Solo lectura',
}

const ROLE_CLASSES: Record<string, string> = {
  admin:      'bg-red-100 text-red-800',
  manager:    'bg-primary/10 text-primary border border-primary/25',
  consultant: 'bg-secondary text-secondary-foreground',
  viewer:     'border text-muted-foreground',
}

interface MeResponse {
  data: {
    id: string
    attributes: User & { phone?: string; permissions?: Record<string, boolean> }
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserProfileDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  // Carga siempre datos frescos del backend al abrir
  const { data: meData, isLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api.get<MeResponse>('/me').then((r) => r.data),
    enabled: open,
    staleTime: 0,
  })

  const me = meData?.data?.attributes
  const meId = meData?.data?.id ?? ''
  const canChangePassword = me?.role === 'admin' || me?.role === 'manager'

  const [name,  setName]  = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Sincronizar campos cuando llega la respuesta del API
  useEffect(() => {
    if (!me) return
    setName(me.name ?? '')
    setPhone(me.phone ?? '')
  }, [me])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch('/me', { user: { name: name.trim(), phone: phone.trim() } }),
    onSuccess: () => {
      // Actualizar el store con los datos editados
      setUser({
        id: meId,
        email: me!.email,
        name: name.trim(),
        role: me!.role,
        avatar_url: me!.avatar_url,
        phone: phone.trim() || undefined,
        active: me!.active,
        created_at: me!.created_at,
        updated_at: new Date().toISOString(),
      })
      toast.success('Perfil actualizado')
      onOpenChange(false)
    },
    onError: (err: unknown) =>
      toast.error(formatRailsError(err, 'Error al guardar el perfil')),
  })

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) {
        throw new Error('La nueva contraseña debe tener al menos 8 caracteres')
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }
      await api.post('/password/change', {
        user: {
          current_password:      currentPassword,
          password:              newPassword,
          password_confirmation: confirmPassword,
        },
      })
    },
    onSuccess: async () => {
      toast.success('Contraseña actualizada. Inicia sesión de nuevo.')
      logout()
      onOpenChange(false)
      try {
        await api.delete('/sessions')
      } catch {
        // La cookie de refresh ya fue revocada en el servidor.
      }
      navigate({ to: '/login' })
    },
    onError: (err: unknown) =>
      toast.error(formatRailsError(err, 'No se pudo cambiar la contraseña')),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-4" />
            Mi perfil
          </DialogTitle>
        </DialogHeader>

        {isLoading || !me ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            {/* Avatar + info */}
            <div className="flex items-center gap-4 py-2">
              <Avatar className="size-14">
                <AvatarFallback className="text-lg">{getInitials(me.name)}</AvatarFallback>
                <AvatarImage src={me.avatar_url} alt={me.name} />
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{me.name}</p>
                <p className="text-sm text-muted-foreground truncate">{me.email}</p>
                <Badge className={`mt-1 text-xs ${ROLE_CLASSES[me.role] ?? ''}`}>
                  {ROLE_LABELS[me.role] ?? me.role}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Nombre completo</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="María López"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Correo electrónico</Label>
                <Input
                  id="profile-email"
                  value={me.email}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  El correo no se puede cambiar desde aquí.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Teléfono</Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 000 0000"
                  type="tel"
                />
              </div>
            </div>

            {canChangePassword ? (
              <>
                <Separator />

                <div className="space-y-4">
                  <p className="text-sm font-medium">Cambiar contraseña</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-current-password">Contraseña actual</Label>
                    <Input
                      id="profile-current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-new-password">Nueva contraseña</Label>
                    <Input
                      id="profile-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-confirm-password">Confirmar nueva contraseña</Label>
                    <Input
                      id="profile-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => passwordMutation.mutate()}
                    disabled={
                      passwordMutation.isPending ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                  >
                    {passwordMutation.isPending && <Spinner className="mr-2" />}
                    Actualizar contraseña
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Para cambiar tu contraseña, contacta a un administrador o manager del equipo.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name.trim()}
              >
                {saveMutation.isPending && <Spinner className="mr-2" />}
                Guardar perfil
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
