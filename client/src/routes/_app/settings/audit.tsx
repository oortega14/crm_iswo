import { createFileRoute, redirect } from '@tanstack/react-router'
import { currentAuth } from '@/lib/authGuards'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSearch, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/utils'
import {
  auditLogsErrorMessage,
  fetchAuditLogs,
  formatAuditAction,
  type AuditEventRow,
} from '@/lib/auditLogsApi'
import { getAuthQueryScope, queryKeys } from '@/lib/queryClient'

const ENTITY_TYPES = [
  'Tenant',
  'Contact',
  'Opportunity',
  'User',
  'Reminder',
  'LandingPage',
  'LeadSource',
  'Pipeline',
  'PipelineStage',
  'ReferralNetwork',
  'Export',
  'AdIntegration',
  'TenantFieldDefinition',
]

export const Route = createFileRoute('/_app/settings/audit')({
  beforeLoad: () => {
    const role = currentAuth().user?.role
    if (role !== 'admin' && role !== 'manager') {
      throw redirect({ to: '/settings' })
    }
  },
  component: AuditSettingsPage,
})

function AuditSettingsPage() {
  const authScope = getAuthQueryScope()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [eventAction, setEventAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailEvent, setDetailEvent] = useState<AuditEventRow | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [q])

  const filters = {
    q: debouncedQ || undefined,
    event_action: eventAction || undefined,
    entity_type: entityType || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    items: 25,
  }

  const listKey = queryKeys.auditLogs.list(authScope ?? '', filters)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: listKey,
    queryFn: () => fetchAuditLogs(filters),
    enabled: Boolean(authScope),
    staleTime: 0,
  })

  const events = data?.events ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">Registro de auditoría</h2>
          <p className="text-sm text-muted-foreground">
            Bitácora inmutable de acciones en el tenant (RFC §9). Solo lectura; admin y manager.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Busca por actor, acción, entidad o rango de fechas</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="audit-q">Búsqueda</Label>
            <div className="relative">
              <FileSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="audit-q"
                className="pl-9"
                placeholder="Email, nombre, acción o metadata..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Acción</Label>
            <Input
              placeholder="p. ej. create, login"
              value={eventAction}
              onChange={(e) => {
                setEventAction(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Entidad</Label>
            <Select
              value={entityType || '_all'}
              onValueChange={(v) => {
                setEntityType(v === '_all' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas</SelectItem>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-from">Desde</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-to">Hasta</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {auditLogsErrorMessage(error)}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No hay eventos con estos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(ev.createdAt, 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{ev.actor.name}</div>
                        {ev.actor.email && (
                          <div className="text-xs text-muted-foreground">{ev.actor.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {formatAuditAction(ev.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ev.entityType}
                        {ev.entityId != null && (
                          <span className="text-muted-foreground"> #{ev.entityId}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDetailEvent(ev)}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages} · {total} evento(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!detailEvent} onOpenChange={(o) => !o && setDetailEvent(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del evento</DialogTitle>
            <DialogDescription>
              {detailEvent && formatAuditAction(detailEvent.action)}
            </DialogDescription>
          </DialogHeader>
          {detailEvent && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Actor: </span>
                {detailEvent.actor.name}
                {detailEvent.actor.role && ` (${detailEvent.actor.role})`}
              </div>
              <div>
                <span className="text-muted-foreground">Entidad: </span>
                {detailEvent.entityType}
                {detailEvent.entityId != null && ` #${detailEvent.entityId}`}
              </div>
              {detailEvent.ipAddress && (
                <div>
                  <span className="text-muted-foreground">IP: </span>
                  {detailEvent.ipAddress}
                </div>
              )}
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                {JSON.stringify(detailEvent.metadata, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
