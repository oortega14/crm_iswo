import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { OpportunityOwnershipFilter } from '@/lib/opportunityOwnership'

interface OpportunityOwnershipToolbarProps {
  value: OpportunityOwnershipFilter
  onChange: (value: OpportunityOwnershipFilter) => void
  counts: { all: number; own: number; network: number }
}

/** RFC §6.3 — leyenda y filtro rápido propias / red (consultor). */
export function OpportunityOwnershipToolbar({
  value,
  onChange,
  counts,
}: OpportunityOwnershipToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Leyenda (RFC §6.3)</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/50 ring-2 ring-border" aria-hidden />
          Propia — puedes editar y mover en el pipeline
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-indigo-500" aria-hidden />
          Red — oportunidad de un referido (solo lectura)
        </span>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={(v) => {
          if (v === 'all' || v === 'own' || v === 'network') onChange(v)
        }}
        className="justify-start sm:justify-end"
      >
        <ToggleGroupItem value="all" size="sm" className="text-xs px-2.5 h-8">
          Todas ({counts.all})
        </ToggleGroupItem>
        <ToggleGroupItem value="own" size="sm" className="text-xs px-2.5 h-8">
          Propias ({counts.own})
        </ToggleGroupItem>
        <ToggleGroupItem value="network" size="sm" className="text-xs px-2.5 h-8">
          Red ({counts.network})
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
