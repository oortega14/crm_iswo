import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Phone, Video, Trash2, Check, CheckCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
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

export type ThreadMessage = {
  id: string
  content: string
  timestamp: string
  isOutgoing: boolean
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  /** Texto de Twilio/Meta si `status` es `failed` */
  errorMessage?: string
}

interface WhatsAppThreadProps {
  opportunityId: string
  contactName: string
  contactPhone: string
  contactAvatar?: string
  messages: ThreadMessage[]
}

export function WhatsAppThread({
  opportunityId,
  contactName,
  contactPhone,
  contactAvatar,
  messages,
}: WhatsAppThreadProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  /** Si el contacto no tiene teléfono en CRM, el usuario puede escribir el destino aquí. */
  const [manualTo, setManualTo] = useState('')

  const toNumber = useMemo(() => {
    const raw = manualTo.trim() || contactPhone.trim()
    return normalizePhoneForWhatsAppDial(raw)
  }, [contactPhone, manualTo])

  const canSend = toNumber.replace(/\D/g, '').length >= 10

  const twilioAuthIssue = messages.some(
    (m) =>
      m.status === 'failed' &&
      (m.errorMessage?.includes('Authenticate') ||
        m.errorMessage?.includes('Authentication Error') ||
        m.errorMessage?.includes('invalid username'))
  )

  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/opportunities/${opportunityId}/whatsapp_messages`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.messages(opportunityId) })
      toast.success('Conversación eliminada')
    },
    onError: (e: unknown) => toast.error(formatRailsError(e)),
  })

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post<{
        data?: { attributes?: { status?: string; error_message?: string | null } }
      }>(`/opportunities/${opportunityId}/whatsapp_messages`, {
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
            : 'Twilio/Meta rechazó el envío. En sandbox de Twilio el contacto debe unirse primero; revisa logs del API.'
        )
      } else {
        toast.success('Mensaje enviado')
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.opportunities.messages(opportunityId),
      })
    },
    onError: (e: unknown) => {
      toast.error(formatRailsError(e))
    },
  })

  const handleSend = () => {
    const text = draft.trim()
    if (!text || !canSend) return
    sendMutation.mutate(text)
  }

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
      {twilioAuthIssue && (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Twilio rechaza el envío: credenciales incorrectas (Account SID y Auth Token deben ser de la
                misma cuenta).
              </p>
              <p>
                Edita la integración Twilio en{' '}
                <Link
                  to="/settings/integrations"
                  className="font-medium underline underline-offset-2 text-primary"
                >
                  Ajustes → Integraciones
                </Link>{' '}
                y vuelve a pegar Account SID (empieza por AC) y Auth Token sin espacios.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 border-2 border-primary-foreground/20 shrink-0">
            <AvatarImage src={contactAvatar} />
            <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground">
              {contactName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
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

      {!contactPhone.trim() && (
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
    </div>
  )
}
