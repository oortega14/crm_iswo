/**
 * Enlaces para contactar al prospecto (tel, SMS, mail, WhatsApp web/app).
 */

export function telHref(phone: string): string {
  const t = phone.trim()
  if (!t) return '#'
  return t.startsWith('tel:') ? t : `tel:${t}`
}

/** sms: — útil en móvil */
export function smsHref(phone: string): string {
  const core = phone.replace(/^tel:/i, '').trim()
  if (!core) return '#'
  return `sms:${core}`
}

export function mailtoHref(email: string, subject?: string): string {
  const e = email.trim()
  if (!e) return '#'
  if (!subject?.trim()) return `mailto:${e}`
  return `mailto:${e}?subject=${encodeURIComponent(subject)}`
}

/** https://wa.me/{solo dígitos} — abre app o WhatsApp Web */
export function whatsAppWaMeUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return `https://wa.me/${digits}`
}
