/** Saludo según hora local (equivalente al ERB de Ruta del día). */
export function getTimeGreeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

/** 🔥 si hay leads calientes; 🚀 si no. */
export function getEnergyEmoji(hotLeadsCount: number): string {
  return hotLeadsCount > 0 ? '🔥' : '🚀'
}

/** Frase motivadora según cantidad de leads calientes (frase_motivadora). */
export function fraseMotivadora(leadsCalientes: number): string {
  if (leadsCalientes === 0) {
    return 'Hoy es un buen día para prospectar y mover el pipeline.'
  }
  if (leadsCalientes === 1) {
    return 'Tienes un lead caliente en juego — priorízalo en tu ruta de hoy.'
  }
  if (leadsCalientes <= 3) {
    return `Tienes ${leadsCalientes} leads calientes — intenta cerrar avance en al menos uno hoy.`
  }
  return `${leadsCalientes} leads calientes activos — enfócate primero en los de mayor BANT.`
}

export function getFirstName(fullName?: string | null): string {
  const trimmed = fullName?.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] ?? ''
}
