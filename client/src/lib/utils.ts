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
export function formatDate(date: string | Date, formatStr: string = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: es })
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
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
    new_lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    qualified: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    proposal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    connected: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    disconnected: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    queued: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    succeeded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Format status label
export function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new_lead: 'Nuevo',
    contacted: 'Contactado',
    qualified: 'Calificado',
    proposal: 'Propuesta',
    won: 'Ganado',
    lost: 'Perdido',
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
  if (typeof window === 'undefined') return 'demo'
  const hostname = window.location.hostname
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }
  return 'demo'
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
