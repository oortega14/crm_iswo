import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { X, Building, MessageSquare, FileText, Bell, History, Pencil, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { useUserRole } from '@/stores/auth'
import {
  jsonApiIncluded,
  jsonApiPrimaryList,
  mapOpportunityLogResource,
  mapOpportunityReminderResource,
  toOpportunityUpdatePayload,
} from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getBantScoreColor,
  getStatusColor,
  formatStatusLabel,
  getInitials,
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { BantSliders } from './BantSliders'
import { TemperatureSelector } from './TemperatureSelector'
import { ActivityLog } from './ActivityLog'
import { RemindersTab } from './RemindersTab'
import { WhatsAppThread, type ThreadMessage } from './WhatsAppThread'
import { ContactActionButtons } from './ContactActionButtons'
import { ContactEditDialog } from '@/components/contacts/ContactEditDialog'
import type { Opportunity, OpportunityTemperature } from '@/types'

interface OpportunitySlideOverProps {
  opportunity?: Opportunity
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OpportunitySlideOver({
  opportunity,
  open,
  onOpenChange,
}: OpportunitySlideOverProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [editContactOpen, setEditContactOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(opportunity?.notes ?? '')
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const role = useUserRole()

  useEffect(() => {
    setNotesValue(opportunity?.notes ?? '')
  }, [opportunity?.id, opportunity?.notes])

  useEffect(() => {
    if (editingNotes) notesRef.current?.focus()
  }, [editingNotes])

  // Fetch activity logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: queryKeys.opportunities.logs(opportunity?.id || ''),
    queryFn: async () => {
      const response = await api.get(`/opportunities/${opportunity?.id}/logs`)
      const rows = jsonApiPrimaryList(response.data)
      const inc = jsonApiIncluded(response.data)
      return rows.map((r) => mapOpportunityLogResource(r, inc))
    },
    enabled: !!opportunity?.id && activeTab === 'activity',
  })

  // Fetch reminders (JSON:API)
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: queryKeys.reminders.byOpportunity(opportunity?.id || ''),
    queryFn: async () => {
      const response = await api.get(`/opportunities/${opportunity?.id}/reminders`)
      return jsonApiPrimaryList(response.data).map(mapOpportunityReminderResource)
    },
    enabled: !!opportunity?.id && activeTab === 'reminders',
  })

  // Fetch WhatsApp messages (JSON:API)
  const { data: threadMessages, isLoading: messagesLoading } = useQuery({
    queryKey: queryKeys.opportunities.messages(opportunity?.id || ''),
    queryFn: async () => {
      const response = await api.get(`/opportunities/${opportunity?.id}/whatsapp_messages`)
      const allowed: ThreadMessage['status'][] = [
        'pending',
        'queued',
        'sent',
        'delivered',
        'read',
        'failed',
      ]
      return jsonApiPrimaryList(response.data)
        .map((r): ThreadMessage => {
          const a = r.attributes ?? {}
          const dir = String(a.direction ?? 'in')
          const st = String(a.status ?? 'sent')
          return {
            id: String(r.id ?? ''),
            content: String(a.body ?? ''),
            timestamp: String(a.created_at ?? ''),
            isOutgoing: dir === 'out' || dir.endsWith('_out'),
            provider: String(a.provider ?? ''),
            status: (allowed.includes(st as ThreadMessage['status'])
              ? st
              : 'sent') as ThreadMessage['status'],
            errorMessage:
              typeof a.error_message === 'string' && a.error_message.trim()
                ? String(a.error_message)
                : undefined,
          }
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    },
    enabled: !!opportunity?.id && activeTab === 'whatsapp',
    refetchInterval: (query) => {
      // Polling activo mientras la pestaña está abierta (para recibir entrantes)
      // o mientras haya mensajes pendientes de confirmación
      const messages = query.state.data ?? []
      const hasPending = messages.some((m) => m.status === 'queued' || m.status === 'sent')
      return hasPending ? 5000 : 10000
    },
  })

  // Update opportunity mutation
  const updateMutation = useMutation({
    mutationFn: async (
      data: Partial<Opportunity> & {
        bant_data?: Record<string, { score?: number; answer?: string }>
      },
    ) => {
      const payload = toOpportunityUpdatePayload(data)
      const response = await api.patch(
        `/opportunities/${opportunity?.id}`,
        JSON.stringify({ opportunity: payload }),
        { headers: { 'Content-Type': 'application/json' } },
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Oportunidad actualizada')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/opportunities/${opportunity?.id}`)
    },
    onSuccess: () => {
      toast.success('Oportunidad eliminada')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('No se pudo eliminar la oportunidad')
    },
  })

  const handleBantUpdate = (field: string, value: number) => {
    const dim =
      field === 'bant_budget'
        ? 'budget'
        : field === 'bant_authority'
          ? 'authority'
          : field === 'bant_need'
            ? 'need'
            : field === 'bant_timeline'
              ? 'timeline'
              : null
    if (!dim) return
    const score = Math.min(100, Math.max(0, Math.round(value * 4)))
    updateMutation.mutate({ bant_data: { [dim]: { score } } })
  }

  if (!opportunity) return null

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => { onOpenChange(false); setConfirmDelete(false) }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex max-h-[100dvh] w-full max-w-lg min-h-0 flex-col border-l bg-background shadow-xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold truncate">
                    {opportunity.contact_name}
                  </h2>
                  <Badge className={cn(getStatusColor(opportunity.status))}>
                    {formatStatusLabel(opportunity.status)}
                  </Badge>
                  {opportunity.contact_id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditContactOpen(true)}
                      title="Editar contacto"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>
                {opportunity.company_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building className="size-3.5" />
                    {opportunity.company_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage src={opportunity.owner?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {opportunity.owner?.name ? getInitials(opportunity.owner.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                {(role === 'admin') && (
                  confirmDelete ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-destructive">¿Eliminar?</span>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setConfirmDelete(false)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                      title="Eliminar oportunidad"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            >
              <TabsList className="mx-4 mt-4 w-fit">
                <TabsTrigger value="overview" className="gap-1.5">
                  <FileText className="size-3.5" />
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5">
                  <History className="size-3.5" />
                  Actividad
                </TabsTrigger>
                <TabsTrigger value="reminders" className="gap-1.5">
                  <Bell className="size-3.5" />
                  Recordatorios
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-1.5">
                  <MessageSquare className="size-3.5" />
                  WhatsApp
                </TabsTrigger>
              </TabsList>

              {/* Overview tab */}
              <TabsContent value="overview" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 flex flex-col gap-6">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                        Contactar
                      </label>
                      <ContactActionButtons
                        phone={opportunity.contact_phone}
                        email={opportunity.contact_email}
                        onOpenWhatsAppInApp={() => setActiveTab('whatsapp')}
                      />
                      {(opportunity.contact_phone || opportunity.contact_email) && (
                        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                          {opportunity.contact_phone ? (
                            <span className="font-mono">{opportunity.contact_phone}</span>
                          ) : null}
                          {opportunity.contact_email ? (
                            <span className="truncate">{opportunity.contact_email}</span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Value */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Valor estimado
                      </label>
                      <p className="text-2xl font-semibold font-mono mt-1">
                        {formatCurrency(opportunity.estimated_value, opportunity.currency)}
                      </p>
                    </div>

                    <Separator />

                    {/* Temperatura */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                        Temperatura del lead
                      </label>
                      <TemperatureSelector
                        value={(opportunity.temperature ?? 'cold') as OpportunityTemperature}
                        disabled={updateMutation.isPending || role === 'viewer'}
                        onChange={(temp) => updateMutation.mutate({ temperature: temp })}
                      />
                    </div>

                    <Separator />

                    {/* BANT Sliders */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                        Puntuación BANT
                      </label>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Total</span>
                          {opportunity.qualified != null && (
                            <Badge variant={opportunity.qualified ? 'success' : 'secondary'} className="text-[10px]">
                              {opportunity.qualified ? 'Calificada' : 'Sin calificar'}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            'text-lg font-mono',
                            getBantScoreColor(opportunity.bant_score)
                          )}
                        >
                          {opportunity.bant_score}
                        </Badge>
                      </div>
                      <BantSliders
                        budget={opportunity.bant_budget}
                        authority={opportunity.bant_authority}
                        need={opportunity.bant_need}
                        timeline={opportunity.bant_timeline}
                        onUpdate={handleBantUpdate}
                        disabled={updateMutation.isPending}
                      />
                    </div>

                    <Separator />

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Creado
                        </label>
                        <p className="text-sm mt-1">
                          {formatDate(opportunity.created_at, 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Última actividad
                        </label>
                        <p className="text-sm mt-1">
                          {opportunity.last_activity_at
                            ? formatRelativeTime(opportunity.last_activity_at)
                            : '-'}
                        </p>
                      </div>
                      {opportunity.expected_close_on && (
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Fecha de cierre estimada
                          </label>
                          <p className="text-sm mt-1">
                            {formatDate(opportunity.expected_close_on, 'dd MMM yyyy')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Origen */}
                    {(opportunity.source || opportunity.source_id) && (
                      <>
                        <Separator />
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Origen
                          </label>
                          <p className="text-sm mt-1">
                            {opportunity.source?.name ?? '—'}
                          </p>
                        </div>
                      </>
                    )}

                    {/* Notes — editable inline */}
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Notas
                        </label>
                        {!editingNotes && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingNotes(true)}
                            title="Editar notas"
                          >
                            <Pencil className="size-3" />
                          </Button>
                        )}
                      </div>
                      {editingNotes ? (
                        <textarea
                          ref={notesRef}
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          onBlur={() => {
                            setEditingNotes(false)
                            if (notesValue !== (opportunity.notes ?? '')) {
                              updateMutation.mutate({ notes: notesValue })
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setNotesValue(opportunity.notes ?? '')
                              setEditingNotes(false)
                            }
                          }}
                          rows={4}
                          placeholder="Añadir notas..."
                          className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                      ) : (
                        <p
                          className="text-sm mt-0.5 whitespace-pre-wrap min-h-[1.5rem] cursor-text text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingNotes(true)}
                        >
                          {notesValue || <span className="italic opacity-50">Sin notas</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Activity tab */}
              <TabsContent value="activity" className="flex-1 overflow-hidden mt-0">
                {logsLoading ? (
                  <div className="p-4 flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="size-8 rounded-full shrink-0" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ActivityLog logs={logs || []} />
                )}
              </TabsContent>

              {/* Reminders tab */}
              <TabsContent value="reminders" className="flex-1 overflow-hidden mt-0">
                {remindersLoading ? (
                  <div className="p-4 flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <RemindersTab
                    reminders={reminders || []}
                    opportunityId={opportunity.id}
                  />
                )}
              </TabsContent>

              {/* WhatsApp tab */}
              <TabsContent
                value="whatsapp"
                className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
              >
                {messagesLoading ? (
                  <div className="flex flex-col gap-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-3/4" />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-0 sm:px-4">
                    <WhatsAppThread
                      opportunityId={opportunity.id}
                      contactName={opportunity.contact_name}
                      contactPhone={opportunity.contact_phone ?? ''}
                      messages={threadMessages ?? []}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <ContactEditDialog
      contactId={opportunity?.contact_id ?? null}
      initialData={{
        firstName: opportunity?.contact_name?.split(' ')[0] ?? '',
        lastName:  opportunity?.contact_name?.split(' ').slice(1).join(' ') ?? '',
        email:     opportunity?.contact_email,
        phone:     opportunity?.contact_phone,
        company:   opportunity?.company_name,
      }}
      open={editContactOpen}
      onOpenChange={setEditContactOpen}
    />
    </>
  )
}
