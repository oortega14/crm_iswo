import api from '@/lib/api'

export interface ClaudeTemperatureCapabilities {
  available: boolean
  model: string
  auto_on_bant_recalc: boolean
  key_hint?: string | null
}

export interface ClassifyTemperatureResult {
  temperature: string
  reasoning: string
  next_action: string
  ai_used: boolean
  fallback_reason?: string | null
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

export function describeClassifyFallback(
  fallbackReason?: string | null,
  anthropicError?: string | null,
): string {
  if (anthropicError?.trim()) return anthropicError.trim()
  if (fallbackReason && FALLBACK_MESSAGES[fallbackReason]) {
    return FALLBACK_MESSAGES[fallbackReason]
  }
  return 'Se usaron reglas locales.'
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
