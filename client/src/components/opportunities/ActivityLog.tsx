import { formatRelativeTime, formatStatusLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { OpportunityLog } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  create:       'Oportunidad creada',
  update:       'Campos actualizados',
  stage_change: 'Cambio de etapa',
  note:         'Nota añadida',
  assign:       'Reasignada',
  destroy:      'Eliminada',
  classify:     'Temperatura clasificada',
  merge:        'Fusión de duplicados',
  merged:       'Fusionada en otra oportunidad',
  export:       'Exportación',
}

const HIDDEN_CHANGE_KEYS = new Set([
  'updated_at',
  'created_at',
  'tenant_id',
  'discarded_at',
  'last_activity_at',
])

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ')
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string') {
    const formatted = formatStatusLabel(value)
    if (formatted !== value) return formatted
    return value.length > 80 ? `${value.slice(0, 77)}…` : value
  }
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value)
      return s.length > 80 ? `${s.slice(0, 77)}…` : s
    } catch {
      return '—'
    }
  }
  return String(value)
}

/** Normaliza `changes_data` del API (diff `{from,to}` o valores planos). */
function changeRows(
  data: Record<string, { from: unknown; to: unknown }> | undefined,
): Array<{ key: string; from: unknown; to: unknown }> {
  if (!data) return []
  const rows: Array<{ key: string; from: unknown; to: unknown }> = []

  for (const [key, value] of Object.entries(data)) {
    if (HIDDEN_CHANGE_KEYS.has(key)) continue

    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      if ('from' in value || 'to' in value) {
        rows.push({
          key,
          from: (value as { from?: unknown }).from,
          to: (value as { to?: unknown }).to,
        })
        continue
      }
    }

    rows.push({ key, from: undefined, to: value })
  }

  return rows
}

function displayAuthor(log: OpportunityLog): string {
  return log.user?.name?.trim() || log.author_name?.trim() || 'Sistema'
}

interface ActivityLogProps {
  logs: OpportunityLog[]
}

export function ActivityLog({ logs }: ActivityLogProps) {
  if (logs.length === 0) {
    return (
      <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay actividad registrada
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="flex flex-col gap-6">
            {logs.map((log) => {
              const rows = changeRows(log.changes_data)
              const author = displayAuthor(log)

              return (
                <div key={log.id} className="relative flex gap-4 pl-6">
                  <div className="absolute left-2 top-2 size-2 rounded-full bg-primary" aria-hidden />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{author}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {formatAction(log.action)}
                    </p>

                    {log.note && (
                      <p className="mb-2 rounded-md bg-muted/50 p-2 text-xs text-foreground">
                        {log.note}
                      </p>
                    )}

                    {rows.length > 0 && (
                      <div className="space-y-1 rounded-md bg-muted/50 p-2 text-xs">
                        {rows.map(({ key, from, to }) => (
                          <div key={key} className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            {from !== undefined && from !== to && (
                              <>
                                <Badge variant="outline" className="text-[10px] px-1.5">
                                  {formatValue(from)}
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              {formatValue(to)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
