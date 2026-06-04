import { z } from 'zod'
import { getTenantFromHostname } from '@/lib/landingUrls'

export const landingUtmSearchSchema = z.object({
  utm_source:   z.string().optional(),
  utm_medium:   z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term:     z.string().optional(),
  utm_content:  z.string().optional(),
  /** Fallback en localhost plano: ?tenant=micasita */
  tenant:       z.string().optional(),
})

export type LandingUtmSearch = z.infer<typeof landingUtmSearchSchema>

/** Resuelve tenant para API pública: subdominio > ?tenant= */
export function resolvePublicLandingTenant(tenantParam?: string): string {
  return tenantParam?.trim().toLowerCase() || getTenantFromHostname()
}
