import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Acentos ISWO: azul marca (#3B82F6) y cian para contraste */
type Accent = 'brand' | 'sky'

const accentMap: Record<Accent, { wrap: string; icon: string; glow: string }> = {
  brand: {
    wrap:
      'border-[#3B82F6]/30 bg-gradient-to-r from-[#3B82F6]/[0.14] via-[#2563EB]/[0.06] to-transparent shadow-[inset_0_1px_0_0_rgba(59,130,246,0.15)]',
    icon:
      'bg-[#3B82F6]/20 text-[#93C5FD] ring-[#3B82F6]/35 ring-offset-background',
    glow: 'bg-[#3B82F6]/25',
  },
  sky: {
    wrap:
      'border-sky-400/30 bg-gradient-to-r from-sky-500/[0.14] via-cyan-500/[0.06] to-transparent shadow-[inset_0_1px_0_0_rgba(56,189,248,0.12)]',
    icon:
      'bg-sky-500/20 text-sky-200 ring-sky-400/35 ring-offset-background',
    glow: 'bg-sky-400/25',
  },
}

interface DashboardSectionProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  accent: Accent
  children: React.ReactNode
  /** Acción opcional a la derecha del título (ej. enlace) */
  action?: React.ReactNode
}

export function DashboardSection({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
  action,
}: DashboardSectionProps) {
  const a = accentMap[accent]

  return (
    <section className="space-y-5">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-4 sm:p-5',
          a.wrap,
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute -right-8 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full blur-3xl',
            a.glow,
          )}
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <span
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-2 ring-offset-2 ring-offset-background',
                a.icon,
              )}
            >
              <Icon className="size-6" strokeWidth={2} />
            </span>
            <div className="space-y-1 pt-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {title}
              </h2>
              {subtitle && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action ? <div className="shrink-0 sm:pt-1">{action}</div> : null}
        </div>
      </div>
      {children}
    </section>
  )
}
