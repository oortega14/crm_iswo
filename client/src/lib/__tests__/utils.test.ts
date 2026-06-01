import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  normalizePhoneForWhatsAppDial,
  getBantScoreColor,
  getBantScoreVariant,
  calculateBantScore,
  getStatusColor,
  formatStatusLabel,
  hasPermission,
  getInitials,
  getTemperatureColor,
  getTemperatureIcon,
  formatTemperatureLabel,
  debounce,
} from '@/lib/utils'

// ─── formatCurrency ─────────────────────────────────────────────────────────
describe('formatCurrency', () => {
  it('formatea COP sin decimales', () => {
    const result = formatCurrency(1500000, 'COP', 'es-CO')
    expect(result).toMatch(/1[.,]500[.,]000/)
  })

  it('usa COP como moneda por defecto', () => {
    const result = formatCurrency(500000)
    expect(result).toMatch(/500[.,]000/)
  })

  it('maneja cero', () => {
    expect(formatCurrency(0)).toMatch(/0/)
  })
})

// ─── formatDate ─────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('formatea fecha ISO', () => {
    const result = formatDate('2026-06-15')
    expect(result).toBe('15 jun 2026')
  })

  it('devuelve — para null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('devuelve — para undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('devuelve — para string inválido', () => {
    expect(formatDate('no-es-fecha')).toBe('—')
  })

  it('acepta formato personalizado', () => {
    const result = formatDate('2026-01-05', 'yyyy/MM/dd')
    expect(result).toBe('2026/01/05')
  })
})

// ─── formatRelativeTime ─────────────────────────────────────────────────────
describe('formatRelativeTime', () => {
  it('devuelve — para null', () => {
    expect(formatRelativeTime(null)).toBe('—')
  })

  it('devuelve — para undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('—')
  })

  it('devuelve — para string inválido', () => {
    expect(formatRelativeTime('invalid')).toBe('—')
  })

  it('devuelve texto relativo para fecha válida', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()
    const result = formatRelativeTime(yesterday)
    expect(result).toMatch(/hace/)
  })
})

// ─── normalizePhoneForWhatsAppDial ──────────────────────────────────────────
describe('normalizePhoneForWhatsAppDial', () => {
  it('respeta números que ya tienen +', () => {
    expect(normalizePhoneForWhatsAppDial('+573001234567')).toBe('+573001234567')
  })

  it('añade +57 a celulares colombianos de 10 dígitos empezando en 3', () => {
    expect(normalizePhoneForWhatsAppDial('3001234567')).toBe('+573001234567')
  })

  it('elimina espacios y guiones', () => {
    expect(normalizePhoneForWhatsAppDial('300 123 4567')).toBe('+573001234567')
    expect(normalizePhoneForWhatsAppDial('300-123-4567')).toBe('+573001234567')
  })

  it('elimina prefijo whatsapp:', () => {
    expect(normalizePhoneForWhatsAppDial('whatsapp:+573001234567')).toBe('+573001234567')
  })

  it('devuelve string vacío para entrada vacía', () => {
    expect(normalizePhoneForWhatsAppDial('')).toBe('')
    expect(normalizePhoneForWhatsAppDial('   ')).toBe('')
  })
})

// ─── getBantScoreColor ───────────────────────────────────────────────────────
describe('getBantScoreColor', () => {
  it('rojo para score < 40', () => {
    expect(getBantScoreColor(0)).toContain('score-low')
    expect(getBantScoreColor(39)).toContain('score-low')
  })

  it('amarillo para score 40–69', () => {
    expect(getBantScoreColor(40)).toContain('score-medium')
    expect(getBantScoreColor(69)).toContain('score-medium')
  })

  it('verde para score >= 70', () => {
    expect(getBantScoreColor(70)).toContain('score-high')
    expect(getBantScoreColor(100)).toContain('score-high')
  })
})

// ─── getBantScoreVariant ─────────────────────────────────────────────────────
describe('getBantScoreVariant', () => {
  it('destructive para score < 40', () => {
    expect(getBantScoreVariant(39)).toBe('destructive')
  })

  it('warning para score 40–69', () => {
    expect(getBantScoreVariant(40)).toBe('warning')
    expect(getBantScoreVariant(69)).toBe('warning')
  })

  it('success para score >= 70', () => {
    expect(getBantScoreVariant(70)).toBe('success')
  })
})

// ─── calculateBantScore ──────────────────────────────────────────────────────
describe('calculateBantScore', () => {
  it('suma las cuatro dimensiones', () => {
    expect(calculateBantScore(25, 25, 25, 25)).toBe(100)
    expect(calculateBantScore(10, 20, 15, 5)).toBe(50)
    expect(calculateBantScore(0, 0, 0, 0)).toBe(0)
  })
})

// ─── getStatusColor ──────────────────────────────────────────────────────────
describe('getStatusColor', () => {
  it('devuelve clases para status conocidos', () => {
    expect(getStatusColor('new_lead')).toBeTruthy()
    expect(getStatusColor('won')).toBeTruthy()
    expect(getStatusColor('lost')).toContain('destructive')
  })

  it('devuelve muted para status desconocido', () => {
    expect(getStatusColor('unknown_status')).toContain('muted')
  })
})

// ─── formatStatusLabel ───────────────────────────────────────────────────────
describe('formatStatusLabel', () => {
  it('traduce al español', () => {
    expect(formatStatusLabel('new_lead')).toBe('Nueva')
    expect(formatStatusLabel('won')).toBe('Cerrada')
    expect(formatStatusLabel('lost')).toBe('Perdido')
    expect(formatStatusLabel('email')).toBe('Email')
    expect(formatStatusLabel('whatsapp')).toBe('WhatsApp')
  })

  it('devuelve el status original si no hay traducción', () => {
    expect(formatStatusLabel('unknown_xyz')).toBe('unknown_xyz')
  })
})

// ─── hasPermission ────────────────────────────────────────────────────────────
describe('hasPermission', () => {
  it('retorna true cuando el rol está en la lista', () => {
    expect(hasPermission('admin', ['admin', 'manager'])).toBe(true)
    expect(hasPermission('manager', ['admin', 'manager'])).toBe(true)
  })

  it('retorna false cuando el rol no está en la lista', () => {
    expect(hasPermission('consultant', ['admin', 'manager'])).toBe(false)
    expect(hasPermission('viewer', ['admin'])).toBe(false)
  })
})

// ─── getInitials ─────────────────────────────────────────────────────────────
describe('getInitials', () => {
  it('extrae dos iniciales', () => {
    expect(getInitials('Juan Pérez')).toBe('JP')
  })

  it('extrae solo la primera si hay un solo token', () => {
    expect(getInitials('Juan')).toBe('J')
  })

  it('máximo dos letras con nombre compuesto', () => {
    expect(getInitials('Juan Carlos Pérez')).toBe('JC')
  })
})

// ─── temperatura helpers ─────────────────────────────────────────────────────
describe('temperature helpers', () => {
  it('getTemperatureColor devuelve clases correctas', () => {
    expect(getTemperatureColor('hot')).toContain('red')
    expect(getTemperatureColor('warm')).toContain('amber')
    expect(getTemperatureColor('cold')).toContain('sky')
  })

  it('getTemperatureIcon devuelve emoji correcto', () => {
    expect(getTemperatureIcon('hot')).toBe('🔥')
    expect(getTemperatureIcon('warm')).toBe('☀️')
    expect(getTemperatureIcon('cold')).toBe('🧊')
  })

  it('formatTemperatureLabel traduce al español', () => {
    expect(formatTemperatureLabel('hot')).toBe('Caliente')
    expect(formatTemperatureLabel('warm')).toBe('Tibio')
    expect(formatTemperatureLabel('cold')).toBe('Frío')
  })
})

// ─── debounce ────────────────────────────────────────────────────────────────
describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }) })
  afterEach(() => { vi.useRealTimers() })

  it('no llama la función antes del delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced()
    expect(fn).not.toHaveBeenCalled()
  })

  it('llama la función después del delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('solo ejecuta la última llamada dentro del delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced()
    debounced()
    debounced()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledOnce()
  })
})
