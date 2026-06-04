import { Flame, Filter, Snowflake, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn, formatStatusLabel } from '@/lib/utils'
import type { OpportunityStatus, Pipeline } from '@/types'

const STATUS_OPTIONS: OpportunityStatus[] = [
  'new_lead',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost',
]

const TEMPERATURE_OPTIONS = [
  { value: 'hot' as const, icon: Flame, label: 'Caliente', cls: 'text-red-600 border-red-200 bg-red-50 data-[active=true]:bg-red-100' },
  { value: 'warm' as const, icon: Sun, label: 'Tibio', cls: 'text-amber-600 border-amber-200 bg-amber-50 data-[active=true]:bg-amber-100' },
  { value: 'cold' as const, icon: Snowflake, label: 'Frío', cls: 'text-sky-600 border-sky-200 bg-sky-50 data-[active=true]:bg-sky-100' },
]

export type OpportunitiesSearchFilters = {
  pipeline?: string
  stage?: string
  temperature?: 'cold' | 'warm' | 'hot'
  owner?: string
  status?: string
  stale?: boolean
}

type UserOption = { id: string; name: string }

interface OpportunitiesFiltersPopoverProps {
  search: OpportunitiesSearchFilters
  onSearchChange: (
    updater: (prev: OpportunitiesSearchFilters) => OpportunitiesSearchFilters,
  ) => void
  activePipeline?: Pipeline
  activePipelineId?: string
  pipelines?: Pipeline[]
  pipelinesLoading?: boolean
  users?: UserOption[]
  showOwnerFilter?: boolean
  staleDays: number
  activeFiltersCount: number
  onClearFilters: () => void
}

export function OpportunitiesFiltersPopover({
  search,
  onSearchChange,
  activePipeline,
  activePipelineId,
  pipelines,
  pipelinesLoading,
  users = [],
  showOwnerFilter,
  staleDays,
  activeFiltersCount,
  onClearFilters,
}: OpportunitiesFiltersPopoverProps) {
  const showPipelineSelect = pipelines && pipelines.length > 1

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={activeFiltersCount > 0 ? 'secondary' : 'outline'}
          className="h-8 gap-1.5"
        >
          <Filter className="size-3.5" />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Filtros</p>
          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onClearFilters}
            >
              Limpiar todo
            </Button>
          )}
        </div>

        <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto p-4">
          {showPipelineSelect && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Embudo</Label>
              <Select
                value={activePipelineId}
                onValueChange={(pipelineId) =>
                  onSearchChange((prev) => ({
                    ...prev,
                    pipeline: pipelineId,
                    stage: undefined,
                  }))
                }
                disabled={pipelinesLoading}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Selecciona pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.is_default ? ' ★' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activePipeline && activePipeline.stages.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Etapa</Label>
              <Select
                value={search.stage ?? '__all__'}
                onValueChange={(v) =>
                  onSearchChange((prev) => ({
                    ...prev,
                    stage: v === '__all__' ? undefined : v,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Todas las etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las etapas</SelectItem>
                  {activePipeline.stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select
              value={search.status ?? '__all__'}
              onValueChange={(v) =>
                onSearchChange((prev) => ({
                  ...prev,
                  status: v === '__all__' ? undefined : v,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los estados</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showOwnerFilter && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Consultor</Label>
              <Select
                value={search.owner ?? '__all__'}
                onValueChange={(v) =>
                  onSearchChange((prev) => ({
                    ...prev,
                    owner: v === '__all__' ? undefined : v,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Temperatura</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPERATURE_OPTIONS.map(({ value, icon: Icon, label, cls }) => (
                <button
                  key={value}
                  type="button"
                  data-active={search.temperature === value}
                  onClick={() =>
                    onSearchChange((prev) => ({
                      ...prev,
                      temperature: prev.temperature === value ? undefined : value,
                    }))
                  }
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition-colors',
                    cls,
                    'dark:bg-transparent',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onSearchChange((prev) => ({
                ...prev,
                stale: !prev.stale || undefined,
              }))
            }
            className={cn(
              'flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors',
              search.stale
                ? 'border-primary/40 bg-primary/5'
                : 'border-border hover:bg-muted/50',
            )}
          >
            <span>Sin actividad reciente</span>
            <span className="text-xs text-muted-foreground">&gt; {staleDays} días</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
