import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  MoreHorizontal,
  Shield,
  Mail,
  Search,
  UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import type { User } from '@/types'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings/users')({
  component: UsersSettingsPage,
})

function UsersSettingsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('user')

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'admin@iswo.com',
          name: 'Carlos Admin',
          role: 'admin',
          avatar: 'https://avatar.vercel.sh/admin@iswo.com',
          createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
          lastLogin: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'user-2',
          email: 'maria@iswo.com',
          name: 'Maria Ventas',
          role: 'manager',
          avatar: 'https://avatar.vercel.sh/maria@iswo.com',
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          lastLogin: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'user-3',
          email: 'juan@iswo.com',
          name: 'Juan Consultor',
          role: 'user',
          avatar: 'https://avatar.vercel.sh/juan@iswo.com',
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          lastLogin: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 'user-4',
          email: 'ana@iswo.com',
          name: 'Ana Marketing',
          role: 'user',
          avatar: 'https://avatar.vercel.sh/ana@iswo.com',
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          lastLogin: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: 'user-5',
          email: 'pedro@iswo.com',
          name: 'Pedro Soporte',
          role: 'readonly',
          avatar: 'https://avatar.vercel.sh/pedro@iswo.com',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          lastLogin: null,
        },
      ]
      
      return mockUsers.filter(
        u => 
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
  })

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { email, role }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Invitacion enviada exitosamente')
      setIsInviteDialogOpen(false)
      setInviteEmail('')
      setInviteRole('user')
    },
    onError: () => {
      toast.error('Error al enviar la invitacion')
    }
  })

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { userId, role }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Rol actualizado')
    }
  })

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return userId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario eliminado')
    }
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Admin</Badge>
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Manager</Badge>
      case 'user':
        return <Badge variant="secondary">Usuario</Badge>
      case 'readonly':
        return <Badge variant="outline">Solo lectura</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Administra los usuarios y sus permisos
          </p>
        </div>
        <Button size="sm" onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar Usuario
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de registro</TableHead>
                  <TableHead>Ultimo acceso</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => changeRoleMutation.mutate({ userId: user.id, role: 'admin' })}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Hacer Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => changeRoleMutation.mutate({ userId: user.id, role: 'manager' })}
                          >
                            Hacer Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => changeRoleMutation.mutate({ userId: user.id, role: 'user' })}
                          >
                            Hacer Usuario
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => changeRoleMutation.mutate({ userId: user.id, role: 'readonly' })}
                          >
                            Solo Lectura
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Reenviar invitacion
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => removeUserMutation.mutate(user.id)}
                          >
                            Eliminar usuario
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Roles Description */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Descripcion de Roles</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-4">
              {getRoleBadge('admin')}
              <span className="text-muted-foreground">
                Acceso completo. Puede gestionar usuarios, configuracion y todos los datos.
              </span>
            </div>
            <div className="flex gap-4">
              {getRoleBadge('manager')}
              <span className="text-muted-foreground">
                Puede ver y editar todas las oportunidades y contactos. Sin acceso a configuracion.
              </span>
            </div>
            <div className="flex gap-4">
              {getRoleBadge('user')}
              <span className="text-muted-foreground">
                Puede ver y editar sus propias oportunidades y contactos asignados.
              </span>
            </div>
            <div className="flex gap-4">
              {getRoleBadge('readonly')}
              <span className="text-muted-foreground">
                Solo puede ver datos. No puede crear ni editar.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
            <DialogDescription>
              Envia una invitacion por email para unirse al equipo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="readonly">Solo Lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail || inviteUserMutation.isPending}
            >
              {inviteUserMutation.isPending && <Spinner className="mr-2" />}
              Enviar Invitacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
