import api from '@/lib/api'
import type { TemperatureAiResult } from '@/lib/temperatureContext'

export type { TemperatureAiResult } from '@/lib/temperatureContext'

export interface ClaudeTemperatureCapabilities {
  available: boolean
  model: string
  /** Clasifica automáticamente al guardar dossier del lead */
  auto_on_save: boolean
  auto_on_bant_recalc: boolean
}

export interface ClassifyTemperatureResult extends TemperatureAiResult {
  temperature: string
}

export interface ClassifyTemperatureResponse {
  data: unknown
  ai_result: ClassifyTemperatureResult
  meta?: {
    claude_configured?: boolean
    model?: string | null
    ai_used?: boolean
    anthropic_status?: number | null
    anthropic_error?: string | null
  }
}

const FALLBACK_MESSAGES: Record<string, string> = {
  missing_api_key: 'Falta ANTHROPIC_API_KEY en api/.env (reinicia Rails después de guardar).',
  api_error: 'Anthropic rechazó la petición (clave, modelo o créditos).',
  network_error: 'No hay conexión con api.anthropic.com desde el servidor.',
  unexpected_error: 'Error interno al llamar a Claude.',
}

function humanizeAnthropicError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('credit balance') || lower.includes('too low')) {
    return (
      'Sin créditos en Anthropic (console.anthropic.com → Plans & Billing). ' +
      'Se aplicó temperatura por reglas locales.'
    )
  }
  if (lower.includes('invalid') && lower.includes('api') && lower.includes('key')) {
    return 'API key de Anthropic inválida. Se aplicó temperatura por reglas locales.'
  }
  if (lower.includes('authentication') || lower.includes('unauthorized')) {
    return 'Anthropic rechazó la API key. Se aplicó temperatura por reglas locales.'
  }
  return raw.trim()
}

export function describeClassifyFallback(
  fallbackReason?: string | null,
  anthropicError?: string | null,
): string {
  if (anthropicError?.trim()) return humanizeAnthropicError(anthropicError)
  if (fallbackReason && FALLBACK_MESSAGES[fallbackReason]) {
    return `${FALLBACK_MESSAGES[fallbackReason]} Se aplicó temperatura por reglas locales.`
  }
  return 'Se aplicó temperatura por reglas locales.'
}

export async function fetchAiCapabilities(): Promise<ClaudeTemperatureCapabilities> {
  const res = await api.get<{ data: { claude_temperature: ClaudeTemperatureCapabilities } }>(
    '/ai/capabilities',
  )
  return res.data.data.claude_temperature
}

export async function classifyOpportunityTemperature(
  opportunityId: string,
): Promise<ClassifyTemperatureResponse> {
  const res = await api.post<ClassifyTemperatureResponse>(`/opportunities/${opportunityId}/classify`)
  return res.data
}
