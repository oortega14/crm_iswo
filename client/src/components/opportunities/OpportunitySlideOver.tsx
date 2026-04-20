import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  X,
  Phone,
  Mail,
  Building,
  Calendar,
  MessageSquare,
  FileText,
  Bell,
  History,
} from 'lucide-react'
import api from '@/lib/api'
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
import { ActivityLog } from './ActivityLog'
import { RemindersTab } from './RemindersTab'
import { WhatsAppThread } from './WhatsAppThread'
import type { Opportunity, OpportunityLog, Reminder, WhatsAppMessage } from '@/types'

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

  // Fetch activity logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: queryKeys.opportunities.logs(opportunity?.id || ''),
    queryFn: async () => {
      const response = await api.get<{ data: OpportunityLog[] }>(
        `/opportunities/${opportunity?.id}/logs`
      )
      return response.data.data
    },
    enabled: !!opportunity?.id && activeTab === 'activity',
  })

  // Fetch reminders
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders', 'opportunity', opportunity?.id],
    queryFn: async () => {
      const response = await api.get<{ data: Reminder[] }>(
        `/opportunities/${opportunity?.id}/reminders`
      )
      return response.data.data
    },
    enabled: !!opportunity?.id && activeTab === 'reminders',
  })

  // Fetch WhatsApp messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: queryKeys.opportunities.messages(opportunity?.id || ''),
    queryFn: async () => {
      const response = await api.get<{ data: WhatsAppMessage[] }>(
        `/opportunities/${opportunity?.id}/whatsapp_messages`
      )
      return response.data.data
    },
    enabled: !!opportunity?.id && activeTab === 'whatsapp',
  })

  // Update opportunity mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Opportunity>) => {
      const response = await api.patch(`/opportunities/${opportunity?.id}`, { data })
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

  const handleBantUpdate = (field: string, value: number) => {
    updateMutation.mutate({ [field]: value })
  }

  if (!opportunity) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-xl flex flex-col"
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
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
                    {/* Contact info */}
                    <div className="flex flex-col gap-2">
                      {opportunity.contact_phone && (
                        <a
                          href={`tel:${opportunity.contact_phone}`}
                          className="flex items-center gap-2 text-sm hover:text-primary"
                        >
                          <Phone className="size-4 text-muted-foreground" />
                          {opportunity.contact_phone}
                        </a>
                      )}
                      {opportunity.contact_email && (
                        <a
                          href={`mailto:${opportunity.contact_email}`}
                          className="flex items-center gap-2 text-sm hover:text-primary"
                        >
                          <Mail className="size-4 text-muted-foreground" />
                          {opportunity.contact_email}
                        </a>
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

                    {/* BANT Sliders */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                        Puntuación BANT
                      </label>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm">Total</span>
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
                    </div>

                    {/* Notes */}
                    {opportunity.notes && (
                      <>
                        <Separator />
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Notas
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {opportunity.notes}
                          </p>
                        </div>
                      </>
                    )}
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
              <TabsContent value="whatsapp" className="flex-1 overflow-hidden mt-0">
                {messagesLoading ? (
                  <div className="p-4 flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-3/4" />
                    ))}
                  </div>
                ) : (
                  <WhatsAppThread
                    messages={messages || []}
                    opportunityId={opportunity.id}
                  />
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
