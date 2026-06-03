import { describe, expect, it } from 'vitest'
import {
  formatCompactCurrency,
  formatStageTimePain,
  getPropertyLabel,
  getStageEmoji,
} from '@/lib/opportunityVisuals'

describe('opportunityVisuals', () => {
  it('getStageEmoji maps diagnóstico', () => {
    expect(getStageEmoji('Diagnóstico')).toBe('🔬')
    expect(getStageEmoji('Visita Agendada')).toBe('🏠')
  })

  it('getPropertyLabel reads custom fields', () => {
    expect(
      getPropertyLabel({ tipo_inmueble: 'Apartamento', ciudad: 'Medellín' }),
    ).toBe('Apartamento')
  })

  it('formatStageTimePain marks long waits urgent', () => {
    const old = new Date()
    old.setDate(old.getDate() - 20)
    const result = formatStageTimePain(old.toISOString())
    expect(result.urgent).toBe(true)
    expect(result.label).toMatch(/20d/)
  })

  it('formatCompactCurrency', () => {
    expect(formatCompactCurrency(5_000_000)).toBe('$5M')
    expect(formatCompactCurrency(25_000_000)).toBe('$25M')
  })
})
