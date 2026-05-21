import { useEffect, useState } from 'react'
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
  const setUser = useAuthStore((s) => s.setUser)

  // Carga siempre datos frescos del backend al abrir
  const { data: meData, isLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api.get<MeResponse>('/me').then((r) => r.data),
    enabled: open,
    staleTime: 0,
  })

  const me = meData?.data?.attributes
  const meId = meData?.data?.id ?? ''

  const [name,  setName]  = useState('')
  const [phone, setPhone] = useState('')

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

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name.trim()}
              >
                {saveMutation.isPending && <Spinner className="mr-2" />}
                Guardar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
