import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatAdminApiError, adminPlatformHeaders } from '@/lib/adminApi'
import api from '@/lib/api'
import { requirePlatformAdmin } from '@/lib/platformRouteGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/_app/settings/landing-requests')({
  beforeLoad: () => {
    requirePlatformAdmin()
  },
  component: LandingRequestsPage,
})

type LandingRequestRow = {
  id: number
  title: string
  slug: string
  approval_status: 'pending' | 'approved' | 'rejected'
  public_url: string
  tenant: { id: number; slug: string; name: string }
  requested_by: { id: number; name: string; email: string } | null
  created_at: string
  reviewed_at: string | null
  rejection_reason: string | null
}

const QUERY_KEY = ['admin-landing-requests', 'pending']

function LandingRequestsPage() {
  const queryClient = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState<LandingRequestRow | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data: requests = [], isLoading, isError, error } = useQuery<LandingRequestRow[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: LandingRequestRow[] }>('/admin/landing_page_requests', {
        params: { status: 'pending' },
        headers: adminPlatformHeaders(),
      })
      return res.data.data ?? []
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
  })

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/landing_page_requests/${id}/approve`, null, {
        headers: adminPlatformHeaders(),
      })
    },
    onSuccess: () => {
      toast.success('Landing aprobada y publicada')
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err: unknown) => {
      toast.error(formatAdminApiError(err, 'No se pudo aprobar la landing.'))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(
        `/admin/landing_page_requests/${id}/reject`,
        { rejection_reason: reason || undefined },
        { headers: adminPlatformHeaders() },
      )
    },
    onSuccess: () => {
      toast.success('Landing rechazada')
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      setRejectTarget(null)
      setRejectionReason('')
    },
    onError: (err: unknown) => {
      toast.error(formatAdminApiError(err, 'No se pudo rechazar la landing.'))
    },
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="size-6" />
          Landings por aprobar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Toda landing nueva de cualquier tenant queda pendiente hasta que un administrador de
          plataforma la revise. Al aprobarla se publica automáticamente y se avisa al solicitante.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitudes pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner className="size-6" />
          ) : isError ? (
            <p className="text-sm text-destructive">
              {formatAdminApiError(error, 'No se pudo cargar la cola de aprobación.')}
            </p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Landing</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Solicitado por</TableHead>
                  <TableHead className="w-[220px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((row) => {
                  const isApproving = approveMutation.isPending && approveMutation.variables === row.id
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{row.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">/{row.slug}</p>
                          </div>
                          <a
                            href={row.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {row.tenant.slug}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{row.tenant.name}</p>
                      </TableCell>
                      <TableCell>
                        {row.requested_by ? (
                          <>
                            <p className="text-sm">{row.requested_by.name}</p>
                            <p className="text-xs text-muted-foreground">{row.requested_by.email}</p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(row.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            {isApproving && <Spinner className="mr-2 size-3" />}
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectTarget(row)
                              setRejectionReason('')
                            }}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            Rechazar
                          </Button>
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

      <Dialog open={rejectTarget != null} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar landing</DialogTitle>
            <DialogDescription>
              {rejectTarget && (
                <>
                  «{rejectTarget.title}» ({rejectTarget.tenant.slug}) — el solicitante verá este motivo
                  en su notificación.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej. falta información de contacto, contenido no cumple políticas…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => {
                if (!rejectTarget) return
                rejectMutation.mutate({ id: rejectTarget.id, reason: rejectionReason.trim() })
              }}
            >
              {rejectMutation.isPending && <Spinner className="mr-2 size-3" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
