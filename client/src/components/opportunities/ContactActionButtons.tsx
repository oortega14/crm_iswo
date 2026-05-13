import { Mail, MessageCircle, MessageSquare, Phone, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mailtoHref, smsHref, telHref, whatsAppWaMeUrl } from '@/lib/contactChannels'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface ContactActionButtonsProps {
  phone?: string | null
  email?: string | null
  /** Iconos solo — kanban / tabla */
  compact?: boolean
  className?: string
  /** Pestaña WhatsApp integrada en el panel */
  onOpenWhatsAppInApp?: () => void
  /** Para tarjetas/listas: no abrir el detalle al pulsar acciones */
  stopClickPropagation?: boolean
}

function stop(e: React.MouseEvent, enabled?: boolean) {
  if (enabled) e.stopPropagation()
}

export function ContactActionButtons({
  phone,
  email,
  compact,
  className,
  onOpenWhatsAppInApp,
  stopClickPropagation,
}: ContactActionButtonsProps) {
  const p = phone?.trim() || ''
  const em = email?.trim() || ''
  const wa = p ? whatsAppWaMeUrl(p) : null
  const hasChannel = Boolean(p || em || onOpenWhatsAppInApp)

  if (!hasChannel) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        Sin teléfono ni correo en el contacto.
      </p>
    )
  }

  const linkCls = compact ? undefined : 'inline-flex items-center gap-2'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5',
        compact ? 'justify-end' : '',
        className,
      )}
      onClick={(e) => stop(e, stopClickPropagation)}
      role="group"
      aria-label="Contactar al prospecto"
    >
      {p ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size={compact ? 'icon' : 'sm'} asChild>
                <a
                  href={telHref(p)}
                  className={linkCls}
                  onClick={(e) => stop(e, stopClickPropagation)}
                >
                  <Phone className="size-3.5 shrink-0" />
                  {!compact && 'Llamar'}
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Llamar por teléfono</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size={compact ? 'icon' : 'sm'} asChild>
                <a
                  href={smsHref(p)}
                  className={linkCls}
                  onClick={(e) => stop(e, stopClickPropagation)}
                >
                  <Smartphone className="size-3.5 shrink-0" />
                  {!compact && 'SMS'}
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar SMS</TooltipContent>
          </Tooltip>
        </>
      ) : null}

      {wa ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size={compact ? 'icon' : 'sm'} asChild>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className={linkCls}
                onClick={(e) => stop(e, stopClickPropagation)}
              >
                <MessageCircle className="size-3.5 shrink-0 text-emerald-600" />
                {!compact && 'WhatsApp'}
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir WhatsApp (app o web)</TooltipContent>
        </Tooltip>
      ) : null}

      {onOpenWhatsAppInApp && p ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size={compact ? 'icon' : 'sm'}
              className={compact ? undefined : 'gap-2'}
              onClick={(e) => {
                stop(e, stopClickPropagation)
                onOpenWhatsAppInApp()
              }}
            >
              <MessageSquare className="size-3.5 shrink-0" />
              {!compact && 'Chat en CRM'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hilo WhatsApp en el CRM</TooltipContent>
        </Tooltip>
      ) : null}

      {em ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size={compact ? 'icon' : 'sm'} asChild>
              <a
                href={mailtoHref(em)}
                className={linkCls}
                onClick={(e) => stop(e, stopClickPropagation)}
              >
                <Mail className="size-3.5 shrink-0" />
                {!compact && 'Correo'}
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Enviar correo</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}
