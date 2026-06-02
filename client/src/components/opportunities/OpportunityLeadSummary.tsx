import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContactActionButtons } from '@/components/opportunities/ContactActionButtons'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import type { ContactSummary } from '@/lib/contactApi'
import type { Opportunity } from '@/types'

function SummaryRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-[minmax(7rem,38%)_1fr] gap-x-3 gap-y-1 items-baseline', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground break-words">{value || '—'}</span>
    </div>
  )
}

interface OpportunityLeadSummaryProps {
  opportunity: Opportunity
  contactDetail?: ContactSummary | null
  canEditLead?: boolean
  onEditLead?: () => void
  onOpenWhatsApp?: () => void
}

export function OpportunityLeadSummary({
  opportunity,
  contactDetail,
  canEditLead,
  onEditLead,
  onOpenWhatsApp,
}: OpportunityLeadSummaryProps) {
  const city =
    contactDetail?.city?.trim() ||
    opportunity.contact_city?.trim() ||
    ''
  const lastContactRaw =
    contactDetail?.lastContactedAt ||
    opportunity.contact_last_contacted_at ||
    ''
  const lastContact = lastContactRaw
    ? formatRelativeTime(lastContactRaw)
    : '—'
  const source =
    opportunity.source?.name?.trim() ||
    opportunity.lead_source_label?.trim() ||
    contactDetail?.sourceLabel?.trim() ||
    '—'
  const created = opportunity.created_at
    ? formatDate(opportunity.created_at, "d 'de' MMMM yyyy, HH:mm")
    : '—'

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-3">
          <SummaryRow
            label="Nombre completo"
            value={opportunity.contact_name}
            className="[&_span:last-child]:text-base [&_span:last-child]:font-semibold"
          />
          <SummaryRow label="Empresa" value={opportunity.company_name?.trim() ?? ''} />
          <SummaryRow label="Ciudad" value={city} />
          <SummaryRow label="Fuente del lead" value={source} />
          <SummaryRow label="Fecha de creación" value={created} />
          <SummaryRow label="Último contacto" value={lastContact} />
        </div>
        {canEditLead && onEditLead && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            onClick={onEditLead}
            title="Editar datos del lead"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>

      {(opportunity.contact_phone || opportunity.contact_email) && (
        <div className="pt-3 border-t border-border/60">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Contactar
          </p>
          <ContactActionButtons
            phone={opportunity.contact_phone}
            email={opportunity.contact_email}
            onOpenWhatsAppInApp={onOpenWhatsApp}
          />
        </div>
      )}
    </div>
  )
}
