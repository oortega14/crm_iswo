import type { ReminderChannel } from '@/lib/reminderApi'
import type { UserRole } from '@/types'

/** Roles que reciben y gestionan recordatorios (no leads ni viewers). */
export const REMINDER_STAFF_ROLES: UserRole[] = ['admin', 'manager', 'consultant']

export function canUseReminders(role?: UserRole | string | null): boolean {
  return REMINDER_STAFF_ROLES.includes(role as UserRole)
}

export const REMINDER_CHANNEL_OPTIONS: {
  value: ReminderChannel
  label: string
  description: string
}[] = [
  {
    value: 'in_app',
    label: 'Campana en el CRM',
    description: 'Notificación en la campana del consultor al vencer.',
  },
  {
    value: 'email',
    label: 'Correo',
    description: 'Email al consultor asignado + campana en el CRM.',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'WhatsApp al teléfono del consultor (perfil de usuario) + campana.',
  },
]

export const REMINDER_CHANNEL_LABEL: Record<ReminderChannel, string> = {
  in_app: 'Campana CRM',
  email: 'Correo',
  whatsapp: 'WhatsApp',
}

export function reminderChannelLabel(channel: string): string {
  return REMINDER_CHANNEL_LABEL[channel as ReminderChannel] ?? channel
}
