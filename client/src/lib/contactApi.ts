import api, { formatRailsError } from '@/lib/api'
import { jsonApiPrimaryList, jsonApiPrimaryOne, type JsonApiResource } from '@/lib/opportunityApi'

export type ContactKind = 'person' | 'company'

export interface ContactSummary {
  id: string
  fullName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: unknown
  position: string
  opportunitiesCount: number
  kind: ContactKind
  city?: string
  country?: string
  notes?: string
  documentId?: string
  ownerName?: string
  ownerId?: string
  sourceLabel?: string
  lastContactedAt?: string
  customFields?: Record<string, unknown>
}

type ContactAttributes = {
  kind: ContactKind
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  phone_e164?: string
  phone_display?: string
  company?: string
  position?: string
  city?: string
  country?: string
  notes?: string
  document_id?: string
  owner_name?: string
  opportunities_count?: number
  source_label?: string
  last_contacted_at?: string
  custom_fields?: Record<string, unknown>
}

export interface ContactListFilters {
  q?: string
  kind?: ContactKind
  owner_id?: string
  page?: number
  items?: number
}

export interface ContactListResult {
  contacts: ContactSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function mapContactResource(resource: JsonApiResource): ContactSummary {
  const attrs = (resource.attributes ?? {}) as ContactAttributes
  const fallbackName = [attrs.first_name, attrs.last_name].filter(Boolean).join(' ').trim()
  const relOwner = resource.relationships?.owner_user?.data as { id?: string } | null

  return {
    id: String(resource.id ?? ''),
    fullName: attrs.full_name || fallbackName || attrs.email || 'Sin nombre',
    firstName: attrs.first_name || '',
    lastName: attrs.last_name || '',
    email: attrs.email || '-',
    phone: attrs.phone_display || attrs.phone_e164 || '-',
    company: attrs.company || '-',
    position: attrs.position || '-',
    opportunitiesCount: attrs.opportunities_count ?? 0,
    kind: attrs.kind || 'person',
    city: attrs.city,
    country: attrs.country,
    notes: attrs.notes,
    documentId: attrs.document_id?.trim() || undefined,
    ownerName: attrs.owner_name?.trim() || undefined,
    ownerId: relOwner?.id != null ? String(relOwner.id) : undefined,
    sourceLabel: attrs.source_label?.trim() || undefined,
    lastContactedAt: attrs.last_contacted_at,
    customFields:
      attrs.custom_fields != null && typeof attrs.custom_fields === 'object'
        ? (attrs.custom_fields as Record<string, unknown>)
        : undefined,
  }
}

export function buildContactListParams(filters: ContactListFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (filters.kind) params.kind = filters.kind
  if (filters.owner_id) params.owner_id = filters.owner_id
  if (filters.q && filters.q.length >= 2) params.q = filters.q
  if (filters.page) params.page = filters.page
  if (filters.items) params.items = filters.items
  return params
}

export async function fetchContactsList(filters: ContactListFilters): Promise<ContactListResult> {
  const page = filters.page ?? 1
  const pageSize = filters.items ?? 10
  const response = await api.get('/contacts', { params: buildContactListParams({ ...filters, page, items: pageSize }) })
  const rows = jsonApiPrimaryList(response.data)
  const pagination = (
    response.data as { meta?: { pagination?: { count?: number; page?: number; pages?: number } } }
  )?.meta?.pagination
  const contacts = rows.filter((r) => r.id).map(mapContactResource)
  return {
    contacts,
    total: pagination?.count ?? contacts.length,
    page: pagination?.page ?? page,
    pageSize,
    totalPages: pagination?.pages ?? 1,
  }
}

export async function fetchContactDetail(id: string): Promise<ContactSummary> {
  const response = await api.get(`/contacts/${id}`)
  const one = jsonApiPrimaryOne(response.data)
  if (!one?.id) throw new Error('Contacto no encontrado')
  return mapContactResource(one)
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`)
}

export async function assignContactOwner(contactId: string, ownerUserId: string): Promise<void> {
  await api.patch(`/contacts/${contactId}`, {
    contact: { owner_user_id: ownerUserId },
  })
}

export type ContactExportFormat = 'csv' | 'xlsx'

export function buildContactExportFilters(filters: {
  kind?: ContactKind
  owner_id?: string
}): Record<string, string> {
  const out: Record<string, string> = {}
  if (filters.kind) out.kind_eq = filters.kind
  if (filters.owner_id) out.owner_user_id_eq = filters.owner_id
  return out
}

export async function downloadContactsExport(
  format: ContactExportFormat,
  filters: Record<string, string>,
): Promise<Blob> {
  const response = await api.get(`/contacts/export.${format}`, {
    params: { filters },
    responseType: 'blob',
  })
  return response.data as Blob
}

export async function enqueueContactsExport(
  format: ContactExportFormat,
  filters: Record<string, string>,
): Promise<void> {
  await api.post('/contacts/export', {
    export_format: format,
    filters,
  })
}

export type ContactImportResult = {
  created_count: number
  skipped_count: number
  errors: Array<{ row: number; message: string }>
}

export async function downloadContactImportTemplate(): Promise<void> {
  const response = await api.get('/contacts/import_template', { responseType: 'blob' })
  const blob = response.data as Blob
  triggerBlobDownload(
    blob,
    'plantilla_contactos.xlsx',
  )
}

export async function importContactsFromFile(file: File): Promise<ContactImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post<{ data: ContactImportResult }>('/contacts/import', formData)
  return response.data.data
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function contactListErrorMessage(err: unknown): string {
  return formatRailsError(err, 'Error al cargar contactos')
}

export function getCompanyLabel(company: unknown): string {
  if (!company) return '-'
  if (typeof company === 'string') return company
  if (typeof company === 'object' && company !== null && 'name' in company) {
    const name = (company as { name?: unknown }).name
    return typeof name === 'string' && name.trim() ? name : '-'
  }
  return '-'
}

export function getContactInitials(value: string | undefined): string {
  if (!value) return '--'
  return value
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
