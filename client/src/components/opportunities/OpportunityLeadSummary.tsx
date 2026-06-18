import { Link } from '@tanstack/react-router'
import {
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Radio,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mailtoHref, telHref } from '@/lib/contactChannels'
import type { ContactSummary } from '@/lib/contactApi'
import { getCompanyLabel } from '@/lib/contactApi'
import type { Opportunity } from '@/types'
import { formatDate, formatRelativeTime } from '@/lib/utils'

const UTM_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
])

function humanizeFieldKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function landingPayloadEntries(customFields?: Record<string, unknown>) {
  const sub = customFields?.landing_submission
  if (!sub || typeof sub !== 'object') return []
  const payload = (sub as { payload?: Record<string, unknown> }).payload
  if (!payload || typeof payload !== 'object') return []
  return Object.entries(payload).filter(
    ([k, v]) => !UTM_KEYS.has(k) && v != null && String(v).trim() !== '',
  )
}

function landingMeta(customFields?: Record<string, unknown>) {
  const id = customFields?.landing_page_id
  const title = customFields?.landing_title
  const slug = customFields?.landing_slug
  return {
    id: id != null ? String(id) : undefined,
    title: typeof title === 'string' ? title : undefined,
    slug: typeof slug === 'string' ? slug : undefined,
  }
}

export interface OpportunityLeadSummaryProps {
  opportunity: Opportunity
  contactDetail?: ContactSummary | null
  canEditLead?: boolean
  onEditLead?: () => void
}

export function OpportunityLeadSummary({
  opportunity,
  contactDetail,
  canEditLead,
  onEditLead,
}: OpportunityLeadSummaryProps) {
  const name =
    contactDetail?.fullName?.trim() ||
    opportunity.contact_name?.trim() ||
    'Sin nombre'
  const email =
    (contactDetail?.email && contactDetail.email !== '-' ? contactDetail.email : undefined) ||
    opportunity.contact_email
  const phone =
    (contactDetail?.phone && contactDetail.phone !== '-' ? contactDetail.phone : undefined) ||
    opportunity.contact_phone
  const company =
    getCompanyLabel(contactDetail?.company) !== '-'
      ? getCompanyLabel(contactDetail?.company)
      : opportunity.company_name
  const city = contactDetail?.city || opportunity.contact_city
  const source =
    opportunity.lead_source_label ||
    contactDetail?.sourceLabel ||
    undefined

  const landing = landingMeta(opportunity.custom_fields)
  const formEntries = landingPayloadEntries(opportunity.custom_fields)
  const hasLanding = Boolean(landing.id || landing.title || landing.slug || formEntries.length > 0)

  const created = opportunity.created_at
    ? formatDate(opportunity.created_at, "d 'de' MMMM yyyy, HH:mm")
    : '—'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Lead / contacto</h3>
          <p className="text-xs text-muted-foreground">
            Datos del prospecto y origen del lead en el CRM.
          </p>
        </div>
        {canEditLead && onEditLead && (
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={onEditLead}>
            <Pencil className="size-3.5 mr-1.5" />
            Editar
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <div className="flex items-start gap-2">
          <UserRound className="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            {company && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">{company}</span>
              </p>
            )}
          </div>
        </div>

        {(email || phone) && (
          <div className="flex flex-col gap-1">
            {phone ? (
              <a
                href={telHref(phone)}
                className="text-xs text-primary inline-flex items-center gap-1.5 hover:underline"
              >
                <Phone className="size-3.5 shrink-0" />
                {phone}
              </a>
            ) : null}
            {email ? (
              <a
                href={mailtoHref(email)}
                className="text-xs text-primary inline-flex items-center gap-1.5 hover:underline break-all"
              >
                <Mail className="size-3.5 shrink-0" />
                {email}
              </a>
            ) : null}
          </div>
        )}

        {city && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            {city}
          </p>
        )}

        {source && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Radio className="size-3.5 shrink-0" />
            Origen: {source}
          </p>
        )}

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="size-3.5 shrink-0" />
          Creado: {created}
          {opportunity.last_activity_at && (
            <span className="text-muted-foreground/80">
              · actividad {formatRelativeTime(opportunity.last_activity_at)}
            </span>
          )}
        </p>
      </div>

      {hasLanding && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Landing page
              </p>
              <p className="text-sm font-medium truncate">
                {landing.title || landing.slug || 'Formulario público'}
              </p>
              {landing.slug && (
                <p className="text-xs text-muted-foreground font-mono truncate">/{landing.slug}</p>
              )}
            </div>
            {landing.id && (
              <Button variant="ghost" size="sm" className="h-7 shrink-0" asChild>
                <Link
                  to="/opportunities"
                  search={{ landing: landing.id, view: 'kanban' }}
                >
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {formEntries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="size-3" />
                Datos del formulario
              </p>
              <dl className="grid gap-1 text-xs">
                {formEntries.map(([key, value]) => (
                  <div key={key} className="flex gap-2 justify-between gap-x-3">
                    <dt className="text-muted-foreground shrink-0">{humanizeFieldKey(key)}</dt>
                    <dd className="font-medium text-right break-all">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {!formEntries.length && opportunity.notes?.includes('Envío landing') && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
              {opportunity.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
