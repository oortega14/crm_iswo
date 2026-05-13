import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Merge,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  Briefcase,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList } from '@/lib/opportunityApi'
import type { JsonApiResource } from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/auth'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppPageShell } from '@/components/layout/AppPageShell'
import { PageHeader } from '@/components/layout/PageHeader'

export const Route = createFileRoute('/_app/duplicates')({
  component: DuplicatesPage,
})

type ContactLite = {
  id: number
  full_name: string
  email?: string | null
  phone?: string | null
}

/** Colisión entre dos oportunidades (origen API `duplicate_flags`). */
interface DuplicateFlagRow {
  id: string
  matchedOn: string
  matchPercent: number
  resolution: string
  pending: boolean
  contactNew: ContactLite | null
  contactExisting: ContactLite | null
  opportunityNewId: string
  opportunityExistingId: string
}

function parseContact(raw: unknown): ContactLite | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'number' ? o.id : Number(o.id)
  if (!Number.isFinite(id)) return null
  const full_name =
    typeof o.full_name === 'string' ? o.full_name : [o.first_name, o.last_name].filter(Boolean).join(' ')
  return {
    id,
    full_name: String(full_name || '').trim(),
    email: o.email != null ? String(o.email) : undefined,
    phone: o.phone != null ? String(o.phone) : undefined,
  }
}

function matchedOnLabel(m: string): string {
  switch (m) {
    case 'phone':
      return 'Coincidencia por teléfono'
    case 'email':
      return 'Coincidencia por email'
    case 'both':
      return 'Coincidencia por email y teléfono'
    default:
      return m || 'Coincidencia detectada'
  }
}

function mapDuplicateFlagResource(r: JsonApiResource): DuplicateFlagRow | null {
  if (!r.id) return null
  const a = r.attributes ?? {}
  const rawScore = a.match_score
  const score =
    typeof rawScore === 'number'
      ? rawScore
      : typeof rawScore === 'string'
        ? parseFloat(rawScore)
        : NaN
  const matchPercent = Number.isFinite(score) ? Math.min(100, Math.round(score * 100)) : 0

  const oppNew = a.opportunity_a_id ?? a.opportunity_a
  const oppEx = a.opportunity_b_id ?? a.opportunity_b
  const opportunityNewId =
    oppNew !== undefined && oppNew !== null ? String(oppNew) : ''
  const opportunityExistingId = oppEx !== undefined && oppEx !== null ? String(oppEx) : ''

  return {
    id: String(r.id),
    matchedOn: typeof a.matched_on === 'string' ? a.matched_on : '',
    matchPercent,
    resolution: typeof a.resolution === 'string' ? a.resolution : 'pending',
    pending: Boolean(a.pending),
    contactNew: parseContact(a.contact_a),
    contactExisting: parseContact(a.contact_b),
    opportunityNewId,
    opportunityExistingId,
  }
}

function initials(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

function ContactBlock({
  title,
  contact,
  opportunityId,
}: {
  title: string
  contact: ContactLite | null
  opportunityId: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback>{initials(contact?.full_name ?? opportunityId ?? '?')}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {contact?.full_name?.trim()
              ? contact.full_name
              : opportunityId
                ? `Sin contacto (oportunidad #${opportunityId})`
                : 'Sin datos de contacto'}
          </p>
          {contact?.email ? (
            <p className="truncate text-sm text-muted-foreground">{contact.email}</p>
          ) : null}
          {contact?.phone ? (
            <p className="text-sm text-muted-foreground">{contact.phone}</p>
          ) : null}
          {opportunityId ? (
            <Badge variant="secondary" className="mt-2 text-xs">
              <Briefcase className="mr-1 inline h-3 w-3" />
              Oportunidad #{opportunityId}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DuplicatesPage() {
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const canResolve = userRole === 'admin' || userRole === 'manager'

  const [resolutionFilter, setResolutionFilter] = useState<'pending' | 'all'>('pending')
  const [mergeConfirmFlag, setMergeConfirmFlag] = useState<DuplicateFlagRow | null>(null)
  const [ignoreConfirmFlag, setIgnoreConfirmFlag] = useState<DuplicateFlagRow | null>(null)

  const {
    data: flags = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.duplicateFlags.list({ resolution: resolutionFilter }),
    queryFn: async () => {
      const params: Record<string, string | number> = {
        items: 50,
        page: 1,
      }
      if (resolutionFilter === 'pending') params.resolution = 'pending'
      const response = await api.get('/duplicate_flags', { params })
      return jsonApiPrimaryList(response.data)
        .filter((r) => r.id)
        .map(mapDuplicateFlagResource)
        .filter((row): row is DuplicateFlagRow => row !== null)
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.duplicateFlags.all })
  }

  const mergeMutation = useMutation({
    mutationFn: async (flagId: string) => {
      await api.post(`/duplicate_flags/${flagId}/merge`, {})
    },
    onSuccess: () => {
      invalidate()
      toast.success('Duplicados fusionados en la oportunidad existente')
      setMergeConfirmFlag(null)
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo fusionar'))
    },
  })

  const ignoreMutation = useMutation({
    mutationFn: async (flagId: string) => {
      await api.post(`/duplicate_flags/${flagId}/ignore`, {})
    },
    onSuccess: () => {
      invalidate()
      toast.success('Marcado como no duplicado')
      setIgnoreConfirmFlag(null)
    },
    onError: (err: unknown) => {
      toast.error(formatRailsError(err, 'No se pudo descartar'))
    },
  })

  const pendingCount = resolutionFilter === 'pending' ? flags.length : flags.filter((f) => f.pending).length
  const resolvedInView =
    resolutionFilter === 'all' ? flags.filter((f) => !f.pending).length : 0

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-red-600'
    if (score >= 80) return 'text-amber-600'
    return 'text-primary'
  }

  return (
    <AppPageShell contentClassName="gap-8">
      <PageHeader
        title="Duplicados"
        description="Colisiones entre oportunidades detectadas en el sistema (teléfono / email)."
      >
        <Select
          value={resolutionFilter}
          onValueChange={(v) => setResolutionFilter(v as 'pending' | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Solo pendientes</SelectItem>
            <SelectItem value="all">Todos los estados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isRefetching}>
          {isRefetching ? <Spinner className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{resolutionFilter === 'pending' ? flags.length : pendingCount}</p>
                <p className="text-xs text-muted-foreground">
                  {resolutionFilter === 'pending' ? 'Pendientes (vista actual)' : 'Pendientes en esta página'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{flags.length}</p>
                <p className="text-xs text-muted-foreground">Registros en esta página</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{resolvedInView}</p>
                <p className="text-xs text-muted-foreground">
                  {resolutionFilter === 'all' ? 'Ya resueltos (en esta página)' : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!canResolve && (
        <p className="text-sm text-muted-foreground">
          Solo administradores y managers pueden fusionar o descartar duplicados. Puedes revisar el listado.
        </p>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="py-6 text-sm text-destructive">
            {formatRailsError(error, 'No se pudieron cargar los duplicados')}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : flags.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h3 className="mt-4 text-lg font-medium">Sin resultados</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {resolutionFilter === 'pending'
                  ? 'No hay colisiones pendientes en el tenant.'
                  : 'No hay registros de duplicados que mostrar con el filtro actual.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <Card key={flag.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Posible duplicado de oportunidad</CardTitle>
                      <CardDescription>{matchedOnLabel(flag.matchedOn)}</CardDescription>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={flag.pending ? 'destructive' : 'secondary'}>
                          {flag.pending ? 'Pendiente' : flag.resolution}
                        </Badge>
                        <Badge variant="outline" className={getMatchScoreColor(flag.matchPercent)}>
                          ~{flag.matchPercent}% similitud
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {flag.pending && canResolve ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIgnoreConfirmFlag(flag)}
                        disabled={ignoreMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Ignorar
                      </Button>
                      <Button size="sm" onClick={() => setMergeConfirmFlag(flag)} disabled={mergeMutation.isPending}>
                        <Merge className="mr-2 h-4 w-4" />
                        Fusionar
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ContactBlock
                    title="Oportunidad detectada (se unifica en la otra al fusionar)"
                    contact={flag.contactNew}
                    opportunityId={flag.opportunityNewId}
                  />
                  <ContactBlock
                    title="Oportunidad existente (se mantiene al fusionar)"
                    contact={flag.contactExisting}
                    opportunityId={flag.opportunityExistingId}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!mergeConfirmFlag} onOpenChange={(o) => !o && setMergeConfirmFlag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fusionar en oportunidad existente</DialogTitle>
            <DialogDescription>
              El backend consolidará la oportunidad nueva (#{mergeConfirmFlag?.opportunityNewId}) en la existente
              (#{mergeConfirmFlag?.opportunityExistingId}) y marcará este aviso como resuelto. Esta acción no se puede
              deshacer desde aquí.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeConfirmFlag(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => mergeConfirmFlag && mergeMutation.mutate(mergeConfirmFlag.id)}
              disabled={mergeMutation.isPending}
            >
              {mergeMutation.isPending && <Spinner className="mr-2" />}
              Confirmar fusión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ignoreConfirmFlag} onOpenChange={(o) => !o && setIgnoreConfirmFlag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar duplicado</DialogTitle>
            <DialogDescription>
              Se marcará esta colisión como ignorada. Las dos oportunidades seguirán existiendo por separado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnoreConfirmFlag(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => ignoreConfirmFlag && ignoreMutation.mutate(ignoreConfirmFlag.id)}
              disabled={ignoreMutation.isPending}
            >
              {ignoreMutation.isPending && <Spinner className="mr-2" />}
              Ignorar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageShell>
  )
}
