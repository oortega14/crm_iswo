import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function DashboardDateLine() {
  const now = new Date()
  const raw = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  const dateStr = raw.charAt(0).toUpperCase() + raw.slice(1)
  return (
    <p className="text-sm text-muted-foreground">
      {dateStr}
    </p>
  )
}
