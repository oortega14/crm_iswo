import api from '@/lib/api'

export type TemperatureSignal = {
  group: string
  label: string
  value: string
}

export type TemperatureAiResult = {
  temperature?: string
  reasoning: string
  next_action: string
  ai_used: boolean
  fallback_reason?: string | null
  anthropic_error?: string | null
  data_considered?: TemperatureSignal[]
}

export type LastTemperatureClassification = TemperatureAiResult & {
  source?: string
  classified_at?: string
}

export type TemperatureContextResponse = {
  signal_count: number
  data_considered: TemperatureSignal[]
  last_classification?: LastTemperatureClassification | null
}

export async function fetchTemperatureContext(
  opportunityId: string,
): Promise<TemperatureContextResponse> {
  const res = await api.get<{ data: TemperatureContextResponse }>(
    `/opportunities/${opportunityId}/temperature_context`,
  )
  return res.data.data
}

export function groupTemperatureSignals(signals: TemperatureSignal[]): Map<string, TemperatureSignal[]> {
  const map = new Map<string, TemperatureSignal[]>()
  for (const s of signals) {
    const list = map.get(s.group) ?? []
    list.push(s)
    map.set(s.group, list)
  }
  return map
}
