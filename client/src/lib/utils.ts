import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency based on tenant settings
export function formatCurrency(
  value: number,
  currency: string = 'COP',
  locale: string = 'es-CO'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format date in tenant timezone
export function formatDate(date: string | Date | null | undefined, formatStr: string = 'dd MMM yyyy'): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (isNaN(d.getTime())) return '—'
    return format(d, formatStr, { locale: es })
  } catch {
    return '—'
  }
}

// Format relative time
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (isNaN(d.getTime())) return '—'
    return formatDistanceToNow(d, { addSuffix: true, locale: es })
  } catch {
    return '—'
  }
}

/** Normaliza a E.164 aproximado para WhatsApp (aligned con backend Phonelib + fallback CO). */
export function normalizePhoneForWhatsAppDial(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  let s = trimmed.replace(/^whatsapp:/i, '').replace(/[\s\-()]/g, '')
  if (!s) return ''
  if (s.startsWith('+')) return s
  const digitsOnly = s.replace(/\D/g, '').replace(/^0+/, '')
  if (/^3\d{9}$/.test(digitsOnly)) return `+57${digitsOnly}`
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) return `+${digitsOnly}`
  return `+${digitsOnly}`
}

// Get BANT score color class
export function getBantScoreColor(score: number): string {
  if (score < 40) return 'bg-score-low text-white'
  if (score < 70) return 'bg-score-medium text-black'
  return 'bg-score-high text-white'
}

// Get BANT score variant
export function getBantScoreVariant(score: number): 'destructive' | 'warning' | 'success' {
  if (score < 40) return 'destructive'
  if (score < 70) return 'warning'
  return 'success'
}

// Calculate BANT score from individual values
export function calculateBantScore(
  budget: number,
  authority: number,
  need: number,
  timeline: number
): number {
  return budget + authority + need + timeline
}

// Get status badge color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new_lead:
      'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    contacted: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    qualified:
      'border border-chart-3/30 bg-chart-3/15 text-chart-3 dark:border-chart-3/40 dark:bg-chart-3/20',
    proposal:
      'border border-chart-5/30 bg-chart-5/15 text-chart-5 dark:border-chart-5/40 dark:bg-chart-5/20',
    won: 'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    closed_won:
      'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    lost: 'bg-destructive/15 text-destructive dark:bg-destructive/25',
    closed_lost: 'bg-destructive/15 text-destructive dark:bg-destructive/25',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    sent: 'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    done: 'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    failed: 'bg-destructive/15 text-destructive dark:bg-destructive/25',
    connected:
      'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    disconnected: 'bg-muted text-muted-foreground',
    error: 'bg-destructive/15 text-destructive dark:bg-destructive/25',
    queued: 'bg-muted text-muted-foreground',
    running:
      'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    succeeded:
      'border border-primary/25 bg-primary/12 text-primary dark:border-primary/35 dark:bg-primary/18 dark:text-primary',
    expired: 'bg-muted text-muted-foreground',
  }
  return colors[status] || 'bg-muted text-muted-foreground'
}

// Format status label
export function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new_lead: 'Nueva',
    contacted: 'Contactado',
    qualified: 'Calificada',
    proposal: 'Propuesta',
    won: 'Cerrada',
    closed_won: 'Cerrada',
    lost: 'Perdido',
    closed_lost: 'Perdida',
    pending: 'Pendiente',
    sent: 'Enviado',
    done: 'Completado',
    failed: 'Fallido',
    connected: 'Conectado',
    disconnected: 'Desconectado',
    error: 'Error',
    queued: 'En cola',
    running: 'Ejecutando',
    succeeded: 'Completado',
    expired: 'Expirado',
    person: 'Persona',
    company: 'Empresa',
    email: 'Email',
    whatsapp: 'WhatsApp',
    in_app: 'En App',
    organic: 'Orgánico',
    paid: 'Pagado',
    referral: 'Referido',
    direct: 'Directo',
    integration: 'Integración',
  }
  return labels[status] || status
}

// Check if user has permission
export function hasPermission(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole)
}

// Get subdomain from hostname
export function getSubdomain(): string {
  if (typeof window === 'undefined') return ''
  const envTenant = import.meta.env.VITE_TENANT_SLUG?.trim().toLowerCase()
  if (envTenant) return envTenant
  const selectedTenant = window.localStorage.getItem('crm-tenant-slug')?.trim().toLowerCase()
  if (selectedTenant) return selectedTenant
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') return ''
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }
  return ''
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
