import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { Send, Phone, Video, Trash2, Check, CheckCheck, AlertCircle, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, normalizePhoneForWhatsAppDial } from '@/lib/utils'
import { toast } from 'sonner'
import api, { formatRailsError } from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'
import { fetchWhatsappTemplates } from '@/lib/whatsappTemplatesApi'

/** WhatsApp cierra la ventana de servicio 24h después del último mensaje del contacto. */
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export type ThreadMessage = {
  id: string
  content: string
  timestamp: string
  isOutgoing: boolean
  /** Proveedor: twilio | whatsapp_cloud | openwa */
  provider?: string
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  errorMessage?: string
}

interface WhatsAppThreadProps {
  /** Hilo dentro de una oportunidad (OpportunitySlideOver) — comportamiento original. */
  opportunityId?: string
  /** Hilo standalone por contacto (bandeja de entrada /whatsapp), sin oportunidad. */
  contactId?: string
  contactName: string
  contactPhone: string
  messages: ThreadMessage[]
  /** false para viewer: oculta el input de envío (la policy ya lo bloquea en backend). */
  canSend?: boolean
  /** Borrar hilo completo — solo disponible en modo oportunidad (no hay endpoint standalone). */
  canDelete?: boolean
}

export function WhatsAppThread({
  opportunityId,
  contactId,
  contactName,
  contactPhone,
  messages,
  canSend: canSendProp = true,
  canDelete = Boolean(opportunityId),
}: WhatsAppThreadProps) {
  const queryClient = useQueryClient()
  const canManageIntegrations = useAuthStore((s) => s.isAdmin() || s.isManager())
  const [draft, setDraft] = useState('')
  const sendUrl = opportunityId
    ? `/opportunities/${opportunityId}/whatsapp_messages`
    : `/whatsapp_conversations/${contactId}/send_message`
  const messagesKey = opportunityId
    ? queryKeys.opportunities.messages(opportunityId)
    : queryKeys.whatsappConversations.messages(contactId ?? '')
  /** Si el contacto no tiene teléfono en CRM, el usuario puede escribir el destino aquí. */
  const [manualTo, setManualTo] = useState('')

  const toNumber = useMemo(() => {
    const raw = manualTo.trim() || contactPhone.trim()
    return normalizePhoneForWhatsAppDial(raw)
  }, [contactPhone, manualTo])

  const canSend = canSendProp && toNumber.replace(/\D/g, '').length >= 10

  /** Último mensaje entrante — si pasaron >24h (o nunca escribió), Meta rechaza texto libre. */
  const lastInboundAt = useMemo(() => {
    const inbound = messages.filter((m) => !m.isOutgoing)
    if (inbound.length === 0) return null
    return inbound.reduce<string>((latest, m) => (m.timestamp > latest ? m.timestamp : latest), inbound[0].timestamp)
  }, [messages])
  const serviceWindowOpen = !!lastInboundAt && Date.now() - new Date(lastInboundAt).getTime() < SERVICE_WINDOW_MS

  const [templateId, setTemplateId] = useState('')
  const [templateVars, setTemplateVars] = useState<string[]>([])

  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.whatsappTemplates.all,
    queryFn: () => fetchWhatsappTemplates(true),
    staleTime: 5 * 60 * 1000,
  })
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null

  const authIssueMessage = messages
    .filter((m) => m.status === 'failed' && m.isOutgoing)
    .reduce<string | null>((found, m) => {
      if (found) return found
      const err = m.errorMessage ?? ''
      if (
        err.includes('Authenticate') ||
        err.includes('Authentication Error') ||
        err.includes('invalid username') ||
        err.includes('rechazó la API Key') ||
        err.includes('Credenciales') ||
        err.includes('credentials')
      ) {
        return err
      }
      return null
    }, null)

  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/opportunities/${opportunityId}/whatsapp_messages`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey })
      toast.success('Conversación eliminada')
    },
    onError: (e: unknown) => toast.error(formatRailsError(e)),
  })

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post<{
        data?: {
          attributes?: {
            status?: string
            error_message?: string | null
            provider_message_id?: string | null
          }
        }
      }>(sendUrl, {
        to_number: toNumber,
        body,
      })
      return res.data
    },
    onSuccess: (payload) => {
      setDraft('')
      const attrs = payload?.data?.attributes
      const err = attrs?.error_message
      if (attrs?.status === 'failed') {
        toast.error(
          err && String(err).trim()
            ? String(err)
            : 'El proveedor rechazó el envío. Revisa las credenciales en Ajustes → Integraciones y los logs del API.'
        )
      } else if (attrs?.status === 'queued' && !attrs.provider_message_id) {
        toast.message('Mensaje en cola', {
          description: 'Aún no llegó al proveedor. Revisa Solid Queue o el estado en el hilo.',
        })
      } else {
        toast.success('Mensaje enviado')
      }
      void queryClient.invalidateQueries({ queryKey: messagesKey })
    },
    onError: (e: unknown) => {
      toast.error(formatRailsError(e))
    },
  })

  const sendTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{
        data?: { attributes?: { status?: string; error_message?: string | null } }
      }>(sendUrl, {
        to_number: toNumber,
        whatsapp_template_id: templateId,
        template_params: templateVars,
      })
      return res.data
    },
    onSuccess: (payload) => {
      const attrs = payload?.data?.attributes
      if (attrs?.status === 'failed') {
        toast.error(attrs.error_message?.trim() || 'Meta rechazó la plantilla. Revisa el nombre y el idioma.')
      } else {
        toast.success('Plantilla enviada — ya puedes seguir la conversación con texto libre')
      }
      setTemplateId('')
      setTemplateVars([])
      void queryClient.invalidateQueries({ queryKey: messagesKey })
    },
    onError: (e: unknown) => toast.error(formatRailsError(e)),
  })

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !canSend) return
    sendMutation.mutate(text)
  }

  const handleSelectTemplate = (id: string) => {
    setTemplateId(id)
    const tpl = templates.find((t) => t.id === id)
    setTemplateVars(tpl ? tpl.variableLabels.map(() => '') : [])
  }

  const canSendTemplate = canSend && !!selectedTemplate && templateVars.every((v) => v.trim())

  const getStatusIcon = (status: ThreadMessage['status'], outgoing: boolean) => {
    if (!outgoing) return null
    switch (status) {
      case 'sent':
      case 'queued':
      case 'pending':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />
      case 'failed':
        return <span className="text-[10px] text-destructive">!</span>
      default:
        return <Check className="h-3 w-3 text-muted-foreground" />
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
      {authIssueMessage && (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Error de credenciales al enviar mensajes.
              </p>
              {canManageIntegrations ? (
                <p>
                  Revisa las credenciales en{' '}
                  <Link
                    to="/settings/integrations"
                    className="font-medium underline underline-offset-2 text-primary"
                  >
                    Ajustes → Integraciones
                  </Link>
                  {': '}
                  {authIssueMessage.trim().slice(0, 160)}
                </p>
              ) : (
                <p>Contacta al administrador para corregir las credenciales del proveedor de mensajería.</p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-medium truncate">{contactName}</p>
            <p className="text-xs text-primary-foreground/80 truncate">
              {contactPhone.trim() ? contactPhone : 'Sin teléfono en contacto'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/15" type="button">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/15" type="button">
            <Phone className="h-5 w-5" />
          </Button>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-destructive/80 hover:text-white"
                  type="button"
                  disabled={clearMutation.isPending || messages.length === 0}
                  title="Eliminar conversación"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar toda la conversación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán los {messages.length} mensajes de este hilo. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => clearMutation.mutate()}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 border-x border-border/50 bg-muted/40 p-4 dark:bg-card/30">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No hay mensajes aún</p>
          ) : (
            messages.map((msg, index) => {
              const showDate =
                index === 0 ||
                format(new Date(msg.timestamp), 'yyyy-MM-dd') !==
                  format(new Date(messages[index - 1].timestamp), 'yyyy-MM-dd')

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                        {format(new Date(msg.timestamp), 'dd MMMM yyyy', { locale: es })}
                      </span>
                    </div>
                  )}
                  <div className={cn('flex', msg.isOutgoing ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[80%] px-3 py-2 rounded-lg shadow-sm',
                        msg.isOutgoing
                          ? 'rounded-br-none bg-primary/20 text-foreground dark:bg-primary/25'
                          : 'rounded-bl-none border border-border/60 bg-card text-foreground'
                      )}
                    >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.isOutgoing && msg.status === 'failed' && msg.errorMessage ? (
                      <p className="text-[11px] text-destructive mt-1 break-words" title={msg.errorMessage}>
                        {msg.errorMessage}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(msg.timestamp), 'HH:mm')}
                        </span>
                        {getStatusIcon(msg.status, msg.isOutgoing)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {canSendProp && !contactPhone.trim() && (
        <div className="shrink-0 border-t border-border/60 px-4 py-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="wa-dest">
            Destino (E.164 o móvil CO)
          </label>
          <Input
            id="wa-dest"
            value={manualTo}
            onChange={(e) => setManualTo(e.target.value)}
            placeholder="+573001234567 o 3001234567"
            className="mt-1"
            disabled={sendMutation.isPending}
          />
        </div>
      )}

      {canSendProp && templates.length > 0 && (
        <div className="shrink-0 border-t border-border/60 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {serviceWindowOpen ? 'Enviar plantilla' : 'Iniciar con plantilla (fuera de ventana 24h)'}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Select value={templateId} onValueChange={handleSelectTemplate}>
              <SelectTrigger className="h-8 flex-1 min-w-[160px] text-xs">
                <SelectValue placeholder="Elegir plantilla…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate?.variableLabels.map((label, i) => (
              <Input
                key={i}
                value={templateVars[i] ?? ''}
                onChange={(e) =>
                  setTemplateVars((vars) => vars.map((v, idx) => (idx === i ? e.target.value : v)))
                }
                placeholder={label}
                className="h-8 flex-1 min-w-[120px] text-xs"
              />
            ))}
            <Button
              size="sm"
              variant="secondary"
              className="h-8 shrink-0"
              disabled={!canSendTemplate || sendTemplateMutation.isPending}
              onClick={() => sendTemplateMutation.mutate()}
            >
              {sendTemplateMutation.isPending ? 'Enviando…' : 'Enviar plantilla'}
            </Button>
          </div>
        </div>
      )}

      {canSendProp && (
        <div className="flex shrink-0 items-center gap-2 border-t bg-muted/50 p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              canSend ? 'Escribe un mensaje…' : 'Indica un número válido arriba o en el contacto'
            }
            className="flex-1"
            disabled={!canSend || sendMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            size="icon"
            type="button"
            disabled={!canSend || sendMutation.isPending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
