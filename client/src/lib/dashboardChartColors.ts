/**
 * Paleta suave para gráficos del dashboard (Recharts).
 * Los badges BANT en tablas siguen usando --score-* (más contraste).
 */

export const bantChartFill = {
  low: 'var(--bant-chart-low)',
  medium: 'var(--bant-chart-medium)',
  high: 'var(--bant-chart-high)',
} as const

const LEAD_SOURCE_BY_KIND: Record<string, string> = {
  meta: 'var(--lead-chart-meta)',
  google: 'var(--lead-chart-google)',
  whatsapp: 'var(--lead-chart-whatsapp)',
  web: 'var(--lead-chart-web)',
  referral: 'var(--lead-chart-referral)',
  manual: 'var(--lead-chart-manual)',
}

const LEAD_SOURCE_FALLBACKS = [
  'var(--lead-chart-fallback-1)',
  'var(--lead-chart-fallback-2)',
  'var(--lead-chart-fallback-3)',
  'var(--lead-chart-fallback-4)',
] as const

export function leadSourceChartColor(kind: string | null, index: number): string {
  if (kind && LEAD_SOURCE_BY_KIND[kind]) return LEAD_SOURCE_BY_KIND[kind]
  return LEAD_SOURCE_FALLBACKS[index % LEAD_SOURCE_FALLBACKS.length]
}
