import { describe, expect, it } from 'vitest'
import {
  fraseMotivadora,
  getEnergyEmoji,
  getFirstName,
  getTimeGreeting,
} from '@/lib/routeDayGreeting'

describe('routeDayGreeting', () => {
  it('getTimeGreeting', () => {
    expect(getTimeGreeting(8)).toBe('Buenos días')
    expect(getTimeGreeting(14)).toBe('Buenas tardes')
    expect(getTimeGreeting(20)).toBe('Buenas noches')
  })

  it('getEnergyEmoji', () => {
    expect(getEnergyEmoji(0)).toBe('🚀')
    expect(getEnergyEmoji(2)).toBe('🔥')
  })

  it('fraseMotivadora varies by count', () => {
    expect(fraseMotivadora(0)).toMatch(/prospectar/i)
    expect(fraseMotivadora(1)).toMatch(/un lead caliente/i)
    expect(fraseMotivadora(5)).toMatch(/5 leads calientes/)
  })

  it('getFirstName', () => {
    expect(getFirstName('Ana María López')).toBe('Ana')
    expect(getFirstName(null)).toBe('')
  })
})
