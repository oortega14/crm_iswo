import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  User,
  Settings,
  FileText,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, type JsonApiResource } from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'

export const Route = createFileRoute('/_app/settings/audit')({
  component: AuditSettingsPage,
})

type AuditLogRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  userName: string
  userEmail?: string
  avatarUrl?: string
  details?: string
  ip?: string
  createdAt: string
}

function entitySlugToApiType(slug: string): string {
  const map: Record<string, string> = {
    opportunity: 'Opportunity',
    contact: 'Contact',
    company: 'Company',
    user: 'User',
    pipeline: 'Pipeline',
    reminder: 'Reminder',
  }
  return map[slug] || slug
}

function mapAuditEvent(r: JsonApiResource): AuditLogRow {
  const a = r.attributes ?? {}
  const actor = (a.actor as { name?: string; email?: string; avatar_url?: string } | undefined) ?? {}
  const entityType = typeof a.entity_type === 'string' ? a.entity_type : ''
  const entityId = a.entity_id != null ? String(a.entity_id) : ''
  const metadata = a.metadata
  let details: string | undefined
  if (metadata != null && typeof metadata === 'object') {
    try {
      const s = JSON.stringify(metadata)
      if (s !== '{}') details = s
    } catch {
      /* ignore */
    }
  }
  const userName = typeof actor.name === 'string' && actor.name ? actor.name : 'Sistema'
  const userEmail = typeof actor.email === 'string' ? actor.email : undefined
  const avatarUrl = typeof actor.avatar_url === 'string' && actor.avatar_url ? actor.avatar_url : undefined
  return {
    id: String(r.id),
    action: String(a.action ?? ''),
    entityType,
    entityId,
    entityName:
      entityType && entityId ? `${entityType.replace(/^.*::/, '')} #${entityId}` : entityType || '—',
    userName,
    userEmail,
    avatarUrl,
    details,
    ip: typeof a.ip_address === 'string' ? a.ip_address : undefined,
    createdAt: String(a.created_at ?? ''),
  }
}

function AuditSettingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, actionFilter, entityFilter])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.auditLogs.list({
      page: currentPage,
      items: pageSize,
      q: searchTerm,
      action: actionFilter,
      entity: entityFilter,
    }),
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: currentPage,
        items: pageSize,
      }
      const q = searchTerm.trim()
      if (q) params.q = q
      if (actionFilter !== 'all') params.event_action = actionFilter
      if (entityFilter !== 'all') params.entity_type = entitySlugToApiType(entityFilter)

      const response = await api.get('/audit_events', { params })
      const logs = jsonApiPrimaryList(response.data).map(mapAuditEvent)
      const pagination = (
        response.data as {
          meta?: { pagination?: { count?: number; pages?: number; page?: number } }
        }
      ).meta?.pagination

      return {
        logs,
        total: pagination?.count ?? logs.length,
        totalPages: Math.max(1, pagination?.pages ?? 1),
        page: pagination?.page ?? currentPage,
      }
    },
    retry: false,
  })

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge variant="success">Crear</Badge>
      case 'update':
        return (
          <Badge className="border border-primary/25 bg-primary/12 text-primary hover:bg-primary/15 dark:border-primary/35 dark:bg-primary/18">
            Actualizar
          </Badge>
        )
      case 'delete':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Eliminar</Badge>
      case 'login':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Login</Badge>
      case 'export':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Exportar</Badge>
      case 'import':
        return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Importar</Badge>
      case 'webhook_received':
        return <Badge className="bg-slate-200 text-slate-900">Webhook</Badge>
      default:
        return <Badge variant="secondary">{action || 'evento'}</Badge>
    }
  }

  const getEntityIcon = (entityType: string) => {
    const key = entityType.split('::').pop()?.toLowerCase() || ''
    switch (key) {
      case 'opportunity':
        return FileText
      case 'contact':
        return User
      case 'company':
        return Users
      case 'user':
        return User
      case 'pipeline':
        return Settings
      case 'reminder':
        return Calendar
      default:
        return FileText
    }
  }

  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Auditoría</h2>
          <p className="text-sm text-muted-foreground">
            Historial de eventos de seguridad y cambios relevantes del tenant
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="create">Crear</SelectItem>
            <SelectItem value="update">Actualizar</SelectItem>
            <SelectItem value="delete">Eliminar</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="export">Exportar</SelectItem>
            <SelectItem value="import">Importar</SelectItem>
            <SelectItem value="webhook_received">Webhook</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            <SelectItem value="opportunity">Oportunidad</SelectItem>
            <SelectItem value="contact">Contacto</SelectItem>
            <SelectItem value="company">Empresa</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
            <SelectItem value="reminder">Recordatorio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isError && (
            <div className="p-6 text-sm text-destructive">
              {formatRailsError(error, 'No se pudo cargar la auditoría')}
            </div>
          )}
          {!isError && isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !isError ? (
            <>
              <div className="divide-y">
                {(data?.logs ?? []).map((log) => {
                  const Icon = getEntityIcon(log.entityType)
                  return (
                    <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.avatarUrl} />
                        <AvatarFallback>
                          {log.userName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.userName}</span>
                          {getActionBadge(log.action)}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Icon className="h-3 w-3" />
                            <span className="text-sm">{log.entityName}</span>
                          </div>
                        </div>
                        {log.details && (
                          <p className="text-sm text-muted-foreground mt-1 break-all line-clamp-2">
                            {log.details}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{log.createdAt ? formatDate(log.createdAt) : '—'}</span>
                          {log.ip && <span>IP: {log.ip}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Página {data?.page ?? currentPage} de {totalPages}
                  {data?.total != null ? (
                    <span className="ml-2">({data.total} eventos)</span>
                  ) : null}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
