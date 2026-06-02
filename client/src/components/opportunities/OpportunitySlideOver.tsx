import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  X,
  MessageSquare,
  FileText,
  Bell,
  History,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  Gauge,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import api from '@/lib/api'
import { useNetworkUserIds } from '@/hooks/useNetworkUserIds'
import { getOpportunityOwnership } from '@/lib/opportunityOwnership'
import { OpportunityOwnershipBadge } from '@/components/opportunities/OpportunityOwnershipBadge'
import { useUser, useUserRole } from '@/stores/auth'
import {
  assignOpportunityOwner,
  fetchOpportunityDetail,
  jsonApiIncluded,
  jsonApiPrimaryList,
  jsonApiPrimaryOne,
  mapOpportunityLogResource,
  mapOpportunityResource,
  mapUserResource,
  moveOpportunityStage,
  recalculateOpportunityBant,
  toOpportunityUpdatePayload,
  upsertOpportunityInQueryCache,
} from '@/lib/opportunityApi'
import { fetchOpportunityReminders } from '@/lib/reminderApi'
import { invalidateContactSegmentMetrics, queryKeys } from '@/lib/queryClient'
import {
  fetchAiCapabilities,
  classifyOpportunityTemperature,
  describeClassifyFallback,
} from '@/lib/aiApi'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BantSliders } from './BantSliders'
import { TemperatureSelector } from './TemperatureSelector'
import { TemperatureBadge } from './TemperatureBadge'
import { ActivityLog } from './ActivityLog'
import { RemindersTab } from './RemindersTab'
import { WhatsAppThread, type ThreadMessage } from './WhatsAppThread'
import { OpportunityLeadSummary } from './OpportunityLeadSummary'
import {
  ContactEditDialog,
  contactEditInitialFromSummary,
} from '@/components/contacts/ContactEditDialog'
import { fetchContactDetail } from '@/lib/contactApi'
import type { Opportunity, OpportunityTemperature, Pipeline, TenantFieldDefinition } from '@/types'

interface OpportunitySlideOverProps {
  opportunityId?: string
  opportunityPreview?: Opportunity
  pipeline?: Pipeline
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OpportunitySlideOver({
  opportunityId,
  opportunityPreview,
  pipeline,
  open,
  onOpenChange,
}: OpportunitySlideOverProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [editContactOpen, setEditContactOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [aiResult, setAiResult] = useState<{
    temperature?: string
    reasoning: string
    next_action: string
    ai_used: boolean
    fallback_reason?: string | null
    anthropic_error?: string | null
  } | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const [editingValue, setEditingValue] = useState(false)
  const [valueInput, setValueInput] = useState('')
  const role = useUserRole()
  const currentUser = useUser()
  const networkUserIds = useNetworkUserIds()

  const { data: opportunityDetail, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.opportunities.detail(opportunityId || ''),
    queryFn: () => fetchOpportunityDetail(opportunityId!),
    enabled: open && !!opportunityId,
    staleTime: 0,
  })

  const opportunity = opportunityDetail ?? opportunityPreview

  const canEditBusiness = useMemo(() => {
    if (!opportunity || role === 'viewer') return false
    if (role === 'admin' || role === 'manager') return true
    const ownerId = opportunity.owner_id || opportunity.owner?.id
    return String(ownerId ?? '') === String(currentUser?.id ?? '')
  }, [opportunity, role, currentUser?.id])

  const ownership = useMemo(
    () =>
      opportunity
        ? getOpportunityOwnership(opportunity, currentUser?.id, networkUserIds, role)
        : null,
    [opportunity, currentUser?.id, networkUserIds, role],
  )

  const { data: contactForLead } = useQuery({
    queryKey: queryKeys.contacts.detail(opportunity?.contact_id ?? ''),
    queryFn: () => fetchContactDetail(opportunity!.contact_id!),
    enabled: open && !!opportunity?.contact_id,
    staleTime: 30_000,
  })

  const canEditLead = canEditBusiness && !!opportunity?.contact_id

  const { data: aiCaps } = useQuery({
    queryKey: queryKeys.ai.capabilities,
    queryFn: fetchAiCapabilities,
    staleTime: 5 * 60 * 1000,
  })

  const claudeAvailable = aiCaps?.available ?? false

  const { data: assignableUsers = [] } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const response = await api.get('/users')
      return jsonApiPrimaryList(response.data)
        .filter((r) => r.id)
        .map(mapUserResource)
    },
    enabled: open && (role === 'admin' || role === 'manager'),
    staleTime: 60_000,
  })

  useEffect(() => {
    setNotesValue(opportunity?.notes ?? '')
    setValueInput(String(opportunity?.estimated_value ?? 0))
    setAiResult(null)
    if (open) setActiveTab('overview')
  }, [opportunity?.id, opportunity?.notes, opportunity?.estimated_value, open])

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

  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: queryKeys.reminders.byOpportunity(opportunity?.id || ''),
    queryFn: () => fetchOpportunityReminders(opportunity!.id),
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
      return response.data
    },
    onSuccess: (body) => {
      const row = jsonApiPrimaryOne(body)
      if (row?.id) {
        const updated = mapOpportunityResource(row)
        upsertOpportunityInQueryCache(queryClient, updated)
      }
      toast.success('Oportunidad actualizada')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      if (opportunity?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunity.id) })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
      onOpenChange(false)
    },
    onError: () => {
      toast.error('No se pudo eliminar la oportunidad')
    },
  })

  const parseClassifyResponse = (data: {
    ai_result: { temperature: string; reasoning: string; next_action: string; ai_used: boolean }
  }) => data.ai_result

  const syncTemperatureMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/opportunities/${opportunity?.id}/sync_temperature`)
      return parseClassifyResponse(response.data)
    },
    onSuccess: (ai_result) => {
      setAiResult(ai_result)
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
      toast.success('Temperatura actualizada según BANT y actividad')
    },
    onError: () => {
      toast.error('No se pudo recalcular la temperatura')
    },
  })

  const moveStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      if (!opportunity?.id) throw new Error('Oportunidad no válida')
      await moveOpportunityStage(opportunity.id, stageId)
    },
    onSuccess: () => {
      toast.success('Etapa actualizada')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunity!.id) })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
    },
    onError: () => toast.error('No se pudo cambiar la etapa'),
  })

  const assignMutation = useMutation({
    mutationFn: async (ownerUserId: string) => {
      if (!opportunity?.id) throw new Error('Oportunidad no válida')
      await assignOpportunityOwner(opportunity.id, ownerUserId)
    },
    onSuccess: () => {
      toast.success('Consultor asignado')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunity!.id) })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
    },
    onError: () => toast.error('No se pudo reasignar'),
  })

  const recalculateBantMutation = useMutation({
    mutationFn: async () => {
      if (!opportunity?.id) throw new Error('Oportunidad no válida')
      return recalculateOpportunityBant(opportunity.id)
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunity!.id) })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
      if (result.temperature_ai?.ai_used) {
        toast.success('BANT recalculado y temperatura actualizada con Claude')
      } else {
        toast.success('Puntuación BANT recalculada')
      }
    },
    onError: () => toast.error('No se pudo recalcular BANT'),
  })

  const classifyMutation = useMutation({
    mutationFn: async () => {
      if (!opportunity?.id) throw new Error('Oportunidad no válida')
      return classifyOpportunityTemperature(opportunity.id)
    },
    onSuccess: (res) => {
      const ai_result = res.ai_result
      setAiResult({
        ...ai_result,
        anthropic_error: res.meta?.anthropic_error ?? null,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void invalidateContactSegmentMetrics(queryClient)
      const usedAi = ai_result.ai_used === true || (res.meta?.ai_used as boolean) === true
      if (usedAi) {
        toast.success(`Clasificado con Claude (${res.meta?.model ?? aiCaps?.model ?? 'IA'})`)
      } else {
        toast.warning(
          describeClassifyFallback(ai_result.fallback_reason, res.meta?.anthropic_error),
          { duration: 8000 },
        )
      }
    },
    onError: () => {
      toast.error('No se pudo clasificar con Claude')
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

  if (!open || !opportunityId) return null

  if (!opportunity && detailLoading) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!opportunity) return null

  const pipelineStages = pipeline?.stages ?? []

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
            {/* Header — negocio (estado / temperatura) */}
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Oportunidad</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn(getStatusColor(opportunity.status))}>
                    {formatStatusLabel(opportunity.status)}
                  </Badge>
                  <OpportunityOwnershipBadge ownership={ownership} />
                  <TemperatureBadge temperature={opportunity.temperature ?? 'cold'} />
                  {opportunity.stage?.name && (
                    <span className="text-xs text-muted-foreground">
                      · {opportunity.stage.name}
                    </span>
                  )}
                </div>
                {opportunity.title && opportunity.title !== opportunity.contact_name && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{opportunity.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {opportunity.owner?.name && (
                  <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[80px]">
                    {opportunity.owner.name.split(' ')[0]}
                  </span>
                )}
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
                    <OpportunityLeadSummary
                      opportunity={opportunity}
                      contactDetail={contactForLead}
                      canEditLead={canEditLead}
                      onEditLead={() => setEditContactOpen(true)}
                      onOpenWhatsApp={() => setActiveTab('whatsapp')}
                    />

                    <Separator />

                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">Negocio</h3>
                      <p className="text-xs text-muted-foreground">
                        Etapa, temperatura, BANT, valor y notas de la oportunidad.
                      </p>
                    </div>

                    {/* Etapa y propietario (RFC: move_stage, assign) */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Etapa del pipeline
                        </label>
                        {!canEditBusiness || pipelineStages.length === 0 ? (
                          <p className="text-sm">{opportunity.stage?.name ?? '—'}</p>
                        ) : (
                          <Select
                            value={opportunity.stage_id || undefined}
                            onValueChange={(stageId) => moveStageMutation.mutate(stageId)}
                            disabled={moveStageMutation.isPending}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar etapa" />
                            </SelectTrigger>
                            <SelectContent>
                              {pipelineStages.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {(role === 'admin' || role === 'manager') && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            <UserRound className="inline size-3 mr-1" />
                            Consultor asignado
                          </label>
                          <Select
                            value={opportunity.owner_id || opportunity.owner?.id || undefined}
                            onValueChange={(uid) => assignMutation.mutate(uid)}
                            disabled={assignMutation.isPending}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Asignar" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Value */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Valor estimado ({opportunity.currency})
                      </label>
                      {canEditBusiness && editingValue ? (
                        <Input
                          type="number"
                          min={0}
                          className="mt-1 font-mono"
                          value={valueInput}
                          onChange={(e) => setValueInput(e.target.value)}
                          onBlur={() => {
                            setEditingValue(false)
                            const num = Number(valueInput)
                            if (Number.isFinite(num) && num !== opportunity.estimated_value) {
                              updateMutation.mutate({ estimated_value: num })
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                            if (e.key === 'Escape') {
                              setValueInput(String(opportunity.estimated_value ?? 0))
                              setEditingValue(false)
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <p
                          className={cn(
                            'text-2xl font-semibold font-mono mt-1',
                            canEditBusiness && 'cursor-pointer hover:text-primary',
                          )}
                          onClick={() => canEditBusiness && setEditingValue(true)}
                        >
                          {formatCurrency(opportunity.estimated_value, opportunity.currency)}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Temperatura */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Temperatura del lead
                        </label>
                        {canEditBusiness && (
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => { setAiResult(null); syncTemperatureMutation.mutate() }}
                              disabled={syncTemperatureMutation.isPending || classifyMutation.isPending}
                              title="Reglas BANT + actividad (sin Claude)"
                            >
                              {syncTemperatureMutation.isPending ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Gauge className="size-3" />
                              )}
                              Reglas
                            </Button>
                            {claudeAvailable && (
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                className="h-7 gap-1 px-2.5 text-xs bg-violet-600 text-white hover:bg-violet-700"
                                onClick={() => { setAiResult(null); classifyMutation.mutate() }}
                                disabled={classifyMutation.isPending || syncTemperatureMutation.isPending}
                                title={`Clasificar con Claude (${aiCaps?.model})`}
                              >
                                {classifyMutation.isPending ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Sparkles className="size-3" />
                                )}
                                Clasificar con Claude AI
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <TemperatureSelector
                        value={(opportunity.temperature ?? 'cold') as OpportunityTemperature}
                        disabled={
                          !canEditBusiness ||
                          updateMutation.isPending ||
                          classifyMutation.isPending ||
                          syncTemperatureMutation.isPending
                        }
                        onChange={(temp) => { setAiResult(null); updateMutation.mutate({ temperature: temp }) }}
                      />
                      <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                        {claudeAvailable ? (
                          <>
                            <strong className="text-foreground">Claude AI</strong> analiza BANT, etapa,
                            origen y actividad. «Reglas» usa solo umbrales locales.
                            {aiCaps?.auto_on_bant_recalc ? ' Auto-clasifica al recalcular BANT.' : ''}
                          </>
                        ) : (
                          <>
                            «Reglas» calcula la temperatura según BANT y días de actividad.
                          </>
                        )}
                      </p>
                      {aiResult && (
                        <div
                          className={cn(
                            'mt-2 rounded-lg border p-2.5 text-xs space-y-1.5',
                            aiResult.ai_used
                              ? 'border-violet-300 bg-violet-50/80 dark:bg-violet-950/30 dark:border-violet-700'
                              : 'border-border bg-muted/40',
                          )}
                        >
                          {aiResult.ai_used && (
                            <Badge className="bg-violet-600 text-white text-[10px]">Claude</Badge>
                          )}
                          <p className="text-foreground/80 leading-relaxed">{aiResult.reasoning}</p>
                          {aiResult.next_action && (
                            <p className="font-medium text-violet-700 dark:text-violet-400">
                              → {aiResult.next_action}
                            </p>
                          )}
                          {!aiResult.ai_used && (
                            <p className="text-muted-foreground italic text-[10px]">
                              {describeClassifyFallback(
                                aiResult.fallback_reason,
                                aiResult.anthropic_error,
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* BANT Sliders */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                        Puntuación BANT
                      </label>
                      <div className="flex items-center justify-between mb-4 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Total</span>
                          {opportunity.qualified != null && (
                            <Badge variant={opportunity.qualified ? 'success' : 'secondary'} className="text-[10px]">
                              {opportunity.qualified ? 'Calificada' : 'Sin calificar'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {canEditBusiness && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => recalculateBantMutation.mutate()}
                              disabled={recalculateBantMutation.isPending}
                              title="Recalcula según criterios BANT del tenant (RFC)"
                            >
                              {recalculateBantMutation.isPending ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <RefreshCw className="size-3" />
                              )}
                              Recalcular
                            </Button>
                          )}
                          <Badge
                            className={cn(
                              'text-lg font-mono',
                              getBantScoreColor(opportunity.bant_score),
                            )}
                          >
                            {opportunity.bant_score}
                          </Badge>
                        </div>
                      </div>
                      <BantSliders
                        budget={opportunity.bant_budget}
                        authority={opportunity.bant_authority}
                        need={opportunity.bant_need}
                        timeline={opportunity.bant_timeline}
                        onUpdate={handleBantUpdate}
                        disabled={!canEditBusiness || updateMutation.isPending}
                      />
                    </div>

                    {opportunity.last_activity_at && (
                      <>
                        <Separator />
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Última actividad comercial
                          </label>
                          <p className="text-sm mt-1">
                            {formatRelativeTime(opportunity.last_activity_at)}
                          </p>
                        </div>
                      </>
                    )}

                    {opportunity.expected_close_on && (
                      <>
                        <Separator />
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Fecha de cierre estimada
                          </label>
                          <p className="text-sm mt-1">
                            {formatDate(opportunity.expected_close_on, 'dd MMM yyyy')}
                          </p>
                        </div>
                      </>
                    )}

                    {/* Campos personalizados por vertical */}
                    <CustomFieldsSection
                      opportunity={opportunity}
                      onSave={(custom_fields) => updateMutation.mutate({ custom_fields })}
                      disabled={!canEditBusiness || updateMutation.isPending}
                    />

                    {/* Notes — editable inline */}
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Notas
                        </label>
                        {canEditBusiness && !editingNotes && (
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
                          className={cn(
                            'text-sm mt-0.5 whitespace-pre-wrap min-h-[1.5rem] text-muted-foreground',
                            canEditBusiness && 'cursor-text hover:text-foreground',
                          )}
                          onClick={() => canEditBusiness && setEditingNotes(true)}
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
      initialData={
        contactForLead
          ? contactEditInitialFromSummary(contactForLead)
          : opportunity?.contact_id
            ? {
                firstName: opportunity.contact_name?.split(' ')[0] ?? '',
                lastName: opportunity.contact_name?.split(' ').slice(1).join(' ') ?? '',
                email: opportunity.contact_email,
                phone: opportunity.contact_phone,
                company: opportunity.company_name,
              }
            : undefined
      }
      open={editContactOpen}
      onOpenChange={setEditContactOpen}
    />
    </>
  )
}

// ============================================================================
// CustomFieldsSection — campos extra configurados por el tenant (F5 Verticales)
// ============================================================================
function mapFieldDefs(raw: unknown): TenantFieldDefinition[] {
  const items = (raw as { data?: unknown[] })?.data ?? []
  return items.map((item) => {
    const r = item as { id?: string; attributes?: Record<string, unknown> }
    const a = r.attributes ?? {}
    return {
      id:         String(r.id ?? ''),
      key:        String(a.key ?? ''),
      label:      String(a.label ?? ''),
      field_type: (a.field_type as TenantFieldDefinition['field_type']) ?? 'text',
      options:    Array.isArray(a.options) ? (a.options as string[]) : [],
      required:   Boolean(a.required),
      entity:     (a.entity as TenantFieldDefinition['entity']) ?? 'opportunity',
      position:   Number(a.position ?? 0),
      active:     Boolean(a.active ?? true),
    }
  })
}

function CustomFieldsSection({
  opportunity,
  onSave,
  disabled,
}: {
  opportunity: Opportunity
  onSave: (fields: Record<string, unknown>) => void
  disabled: boolean
}) {
  const { data: defs = [] } = useQuery({
    queryKey: ['tenant_field_definitions', 'opportunity'],
    queryFn: async () => {
      const res = await api.get('/tenant_field_definitions', { params: { entity: 'opportunity' } })
      return mapFieldDefs(res.data)
    },
    staleTime: 5 * 60 * 1000,
  })

  const [localValues, setLocalValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    setLocalValues(opportunity.custom_fields ?? {})
  }, [opportunity.id, opportunity.custom_fields])

  if (defs.length === 0) return null

  const handleBlur = (key: string) => {
    const current = opportunity.custom_fields ?? {}
    if (localValues[key] !== current[key]) {
      onSave({ ...current, ...localValues })
    }
  }

  const handleChange = (key: string, value: unknown) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSelectChange = (key: string, value: string, current: Record<string, unknown>) => {
    const updated = { ...current, [key]: value }
    setLocalValues(updated)
    onSave(updated)
  }

  const handleBooleanChange = (key: string, value: boolean, current: Record<string, unknown>) => {
    const updated = { ...current, [key]: value }
    setLocalValues(updated)
    onSave(updated)
  }

  return (
    <>
      <Separator />
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
          Datos del negocio
        </label>
        <div className="space-y-3">
          {defs.map((def) => {
            const val = localValues[def.key]
            const current = opportunity.custom_fields ?? {}

            if (def.field_type === 'boolean') {
              return (
                <div key={def.key} className="flex items-center justify-between">
                  <span className="text-sm">{def.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    disabled={disabled}
                    onChange={(e) => handleBooleanChange(def.key, e.target.checked, current)}
                    className="size-4 rounded border-input accent-primary"
                  />
                </div>
              )
            }

            if (def.field_type === 'select') {
              return (
                <div key={def.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{def.label}</label>
                  <Select
                    value={String(val ?? '')}
                    disabled={disabled}
                    onValueChange={(v) => handleSelectChange(def.key, v, current)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {def.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            }

            return (
              <div key={def.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{def.label}</label>
                <input
                  type={def.field_type === 'date' ? 'date' : def.field_type === 'number' || def.field_type === 'currency' ? 'number' : 'text'}
                  value={String(val ?? '')}
                  disabled={disabled}
                  onChange={(e) => handleChange(def.key, e.target.value)}
                  onBlur={() => handleBlur(def.key)}
                  placeholder={def.required ? `${def.label} *` : def.label}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
