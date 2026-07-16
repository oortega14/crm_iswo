import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gauge, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TemperatureSelector } from '@/components/opportunities/TemperatureSelector'
import { TemperatureBadge } from '@/components/opportunities/TemperatureBadge'
import {
  fetchTemperatureContext,
  groupTemperatureSignals,
  type TemperatureAiResult,
  type TemperatureSignal,
} from '@/lib/temperatureContext'
import { describeClassifyFallback } from '@/lib/aiApi'
import type { ClaudeTemperatureCapabilities } from '@/lib/aiApi'
import type { OpportunityTemperature } from '@/types'
import { cn } from '@/lib/utils'

export type { TemperatureAiResult } from '@/lib/temperatureContext'

interface OpportunityTemperaturePanelProps {
  opportunityId: string
  temperature: OpportunityTemperature
  canEdit: boolean
  claudeAvailable: boolean
  aiCaps?: ClaudeTemperatureCapabilities | null
  aiResult: TemperatureAiResult | null
  onTemperatureChange: (temp: OpportunityTemperature) => void
  onClassify: () => void
  onSyncRules: () => void
  classifyPending: boolean
  syncPending: boolean
  updatePending: boolean
  autoClassifying?: boolean
}

const GROUP_ORDER = ['Contacto', 'Oportunidad', 'BANT', 'Campos', 'Landing', 'Formulario landing', 'Actividad']

export function OpportunityTemperaturePanel({
  opportunityId,
  temperature,
  canEdit,
  claudeAvailable,
  aiCaps,
  aiResult,
  onTemperatureChange,
  onClassify,
  onSyncRules,
  classifyPending,
  syncPending,
  updatePending,
  autoClassifying = false,
}: OpportunityTemperaturePanelProps) {
  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ['temperature_context', opportunityId],
    queryFn: () => fetchTemperatureContext(opportunityId),
    enabled: Boolean(opportunityId),
    staleTime: 30_000,
  })

  const signals = aiResult?.data_considered?.length
    ? aiResult.data_considered
    : (context?.data_considered ?? [])

  const grouped = useMemo(() => groupTemperatureSignals(signals), [signals])

  const orderedGroups = useMemo(() => {
    const keys = [...grouped.keys()]
    return keys.sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a)
      const ib = GROUP_ORDER.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  }, [grouped])

  const busy = classifyPending || syncPending || updatePending || autoClassifying

  return (
    <div className="rounded-xl border border-violet-500/25 bg-gradient-to-b from-violet-500/5 to-transparent p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-sm font-semibold text-foreground">Clasificación IA de temperatura</h3>
            <TemperatureBadge temperature={temperature} showLabel />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-prose">
            Claude analiza el dossier completo del lead: contacto, negocio, BANT, campos del vertical,
            landing y actividad.
            {aiCaps?.auto_on_save
              ? ' Al guardar cambios se recalcula automáticamente.'
              : ' Completa los datos y pulsa Calcular con IA.'}
          </p>
          {autoClassifying && (
            <p className="flex items-center gap-1.5 text-xs text-violet-700 dark:text-violet-300">
              <Loader2 className="size-3 animate-spin" />
              Clasificando automáticamente con IA…
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={onSyncRules}
              disabled={busy}
              title="Umbrales BANT + actividad (sin IA)"
            >
              {syncPending ? <Loader2 className="size-3 animate-spin" /> : <Gauge className="size-3" />}
              Reglas
            </Button>
            {claudeAvailable && (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 text-xs bg-violet-600 text-white hover:bg-violet-700"
                onClick={onClassify}
                disabled={busy}
                title={`Clasificar con ${aiCaps?.model ?? 'Claude'}`}
              >
                {classifyPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Calcular con IA
              </Button>
            )}
          </div>
        )}
      </div>

      <TemperatureSelector
        value={temperature}
        disabled={!canEdit || busy}
        onChange={onTemperatureChange}
      />

      <Separator className="bg-violet-500/15" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Datos que analiza la IA
          </p>
          {contextLoading ? (
            <span className="text-[10px] text-muted-foreground">Actualizando…</span>
          ) : (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {signals.length} campo{signals.length === 1 ? '' : 's'} con valor
            </Badge>
          )}
        </div>

        {signals.length === 0 && !contextLoading ? (
          <p className="text-xs text-muted-foreground italic">
            Aún no hay datos suficientes. Edita el contacto, BANT, campos del negocio o notas.
          </p>
        ) : (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {orderedGroups.map((group) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 mb-1.5">
                  {group}
                </p>
                <dl className="grid gap-1">
                  {(grouped.get(group) ?? []).map((s) => (
                    <div
                      key={`${group}-${s.label}`}
                      className="grid grid-cols-[minmax(6rem,34%)_1fr] gap-2 text-[11px] rounded-md bg-background/60 px-2 py-1"
                    >
                      <dt className="text-muted-foreground truncate">{s.label}</dt>
                      <dd className="text-foreground font-medium break-words">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      {aiResult && (
        <div
          className={cn(
            'rounded-lg border p-3 text-xs space-y-2',
            aiResult.ai_used
              ? 'border-violet-300 bg-violet-50/80 dark:bg-violet-950/30 dark:border-violet-700'
              : 'border-border bg-muted/40',
          )}
        >
          {aiResult.ai_used ? (
            <Badge className="bg-violet-600 text-white text-[10px]">Claude</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Reglas locales</Badge>
          )}
          <p className="text-foreground/90 leading-relaxed">{aiResult.reasoning}</p>
          {aiResult.next_action && (
            <p className="font-medium text-violet-700 dark:text-violet-400">
              → {aiResult.next_action}
            </p>
          )}
          {!aiResult.ai_used && (
            <p className="text-muted-foreground italic text-[10px]">
              {describeClassifyFallback(aiResult.fallback_reason, aiResult.anthropic_error)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
