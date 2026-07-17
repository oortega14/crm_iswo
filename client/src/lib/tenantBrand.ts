import type { Tenant } from '@/types'

/** Colores de tenant que se confunden con el fondo oscuro del CRM */
export const INVISIBLE_ON_DARK = new Set([
  '#0f172a',
  '#111827',
  '#1e293b',
  '#0b1220',
  '#020617',
])

export type KnownBrandSlug = 'iswo' | 'micasita' | 'libranzas'

export interface TenantBrandPreset {
  slug: KnownBrandSlug
  label: string
  primary: string
  gradientTo: string
  accentRing: string
  onPrimary: string
  legacyColors?: Set<string>
}

export const TENANT_BRANDS: Record<KnownBrandSlug, TenantBrandPreset> = {
  iswo: {
    slug: 'iswo',
    label: 'ISWO',
    primary: '#1D4ED8',
    gradientTo: '#2563EB',
    accentRing: '#38BDF8',
    onPrimary: '#FFFFFF',
    legacyColors: INVISIBLE_ON_DARK,
  },
  micasita: {
    slug: 'micasita',
    label: 'Mi Casita',
    primary: '#B45309',
    gradientTo: '#D97706',
    accentRing: '#FDE68A',
    onPrimary: '#FFFFFF',
    legacyColors: new Set([
      '#1d4ed8',
      '#2563eb',
      '#1e40af',
      '#3b82f6',
      '#0d9488',
      '#14b8a6',
      '#0f766e',
    ]),
  },
  libranzas: {
    slug: 'libranzas',
    label: 'Libranzas',
    primary: '#047857',
    gradientTo: '#059669',
    accentRing: '#6EE7B7',
    onPrimary: '#FFFFFF',
    legacyColors: new Set(['#166534', '#14532d']),
  },
}

/** @deprecated Usar TENANT_BRANDS.iswo */
export const ISWO_BRAND = {
  primary: TENANT_BRANDS.iswo.primary,
  primaryHover: TENANT_BRANDS.iswo.gradientTo,
  accent: TENANT_BRANDS.iswo.accentRing,
  onPrimary: TENANT_BRANDS.iswo.onPrimary,
  invisibleOnDark: INVISIBLE_ON_DARK,
} as const

const SLUG_ALIASES: Record<string, KnownBrandSlug> = {
  mi_casita: 'micasita',
  'mi-casita': 'micasita',
  casita: 'micasita',
}

const NAME_ALIASES: Record<string, KnownBrandSlug> = {
  iswo: 'iswo',
  'mi casita': 'micasita',
  'libranzas iswo': 'libranzas',
  libranzas: 'libranzas',
}

function normalizeSlug(raw: string | null | undefined): string {
  return raw?.trim().toLowerCase() ?? ''
}

export function resolveKnownBrandSlug(
  tenantOrSlug: Pick<Tenant, 'subdomain' | 'name'> | string | null | undefined,
): KnownBrandSlug | null {
  if (!tenantOrSlug) return null

  if (typeof tenantOrSlug === 'string') {
    const slug = SLUG_ALIASES[normalizeSlug(tenantOrSlug)] ?? normalizeSlug(tenantOrSlug)
    return slug in TENANT_BRANDS ? (slug as KnownBrandSlug) : null
  }

  const slug = SLUG_ALIASES[normalizeSlug(tenantOrSlug.subdomain)] ?? normalizeSlug(tenantOrSlug.subdomain)
  if (slug in TENANT_BRANDS) return slug as KnownBrandSlug

  const nameKey = tenantOrSlug.name?.trim().toLowerCase() ?? ''
  return NAME_ALIASES[nameKey] ?? null
}

export function resolveTenantBrand(
  tenantOrSlug: Pick<Tenant, 'subdomain' | 'name'> | string | null | undefined,
): TenantBrandPreset | null {
  const slug = resolveKnownBrandSlug(tenantOrSlug)
  return slug ? TENANT_BRANDS[slug] : null
}

export function resolvePrimaryColor(
  tenant: Pick<Tenant, 'subdomain' | 'name' | 'primary_color'> | null | undefined,
): string | undefined {
  if (!tenant) return undefined

  const brand = resolveTenantBrand(tenant)
  if (!brand) return tenant.primary_color

  const raw = tenant.primary_color?.trim()
  if (!raw || brand.legacyColors?.has(raw.toLowerCase())) {
    return brand.primary
  }
  return raw
}

export function normalizeTenantBranding(tenant: Tenant): Tenant {
  const primary_color = resolvePrimaryColor(tenant) ?? tenant.primary_color
  if (primary_color === tenant.primary_color) return tenant
  return { ...tenant, primary_color }
}

export function isIswoTenant(tenant: Pick<Tenant, 'subdomain' | 'name'> | null | undefined): boolean {
  return resolveKnownBrandSlug(tenant) === 'iswo'
}

export function isMiCasitaTenant(tenant: Pick<Tenant, 'subdomain' | 'name'> | null | undefined): boolean {
  return resolveKnownBrandSlug(tenant) === 'micasita'
}

export function isLibranzasTenant(tenant: Pick<Tenant, 'subdomain' | 'name'> | null | undefined): boolean {
  return resolveKnownBrandSlug(tenant) === 'libranzas'
}

/** @deprecated Usar resolvePrimaryColor */
export function resolveIswoPrimaryColor(
  tenant: Pick<Tenant, 'subdomain' | 'name' | 'primary_color'> | null | undefined,
): string | undefined {
  return resolvePrimaryColor(tenant)
}
