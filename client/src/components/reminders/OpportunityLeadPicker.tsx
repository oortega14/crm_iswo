import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchOpportunityOptionsForReminder,
  REMINDER_LEAD_SEARCH_MIN_CHARS,
  type OpportunityReminderOption,
} from '@/lib/reminderApi'
import { fetchOpportunityDetail } from '@/lib/opportunityApi'
import { Input } from '@/components/ui/input'

interface OpportunityLeadPickerProps {
  value: string
  onValueChange: (opportunityId: string, option?: OpportunityReminderOption) => void
  disabled?: boolean
  placeholder?: string
}

/** Muestra iniciales del contacto si coinciden con la búsqueda de 2 letras (ej. CR · Camila Restrepo). */
function formatLeadLabel(label: string, query: string): string {
  if (query.length !== REMINDER_LEAD_SEARCH_MIN_CHARS) return label
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return label
  const initials = `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  if (initials.toLowerCase() !== query.toLowerCase()) return label
  return `${initials} · ${label}`
}

export function OpportunityLeadPicker({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Iniciales del lead (ej. CR)…',
}: OpportunityLeadPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(search.trim()), 200)
    return () => window.clearTimeout(id)
  }, [search])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const canSearch = debouncedQ.length >= REMINDER_LEAD_SEARCH_MIN_CHARS
  const searchChars = search.trim().length

  const { data: options = [], isFetching, isError } = useQuery({
    queryKey: ['opportunities', 'reminder-picker', debouncedQ],
    queryFn: () => fetchOpportunityOptionsForReminder(debouncedQ),
    enabled: open && !disabled && canSearch,
    staleTime: 15_000,
  })

  const { data: lockedDetail } = useQuery({
    queryKey: ['opportunities', 'reminder-picker-detail', value],
    queryFn: () => fetchOpportunityDetail(value),
    enabled: Boolean(value) && disabled,
  })

  const { data: valueDetail } = useQuery({
    queryKey: ['opportunities', 'reminder-picker-detail', value],
    queryFn: () => fetchOpportunityDetail(value),
    enabled: Boolean(value) && !disabled && !selectedLabel && Boolean(value),
  })

  const resolvedLabel = useMemo(() => {
    if (lockedDetail) {
      return lockedDetail.contact_name || lockedDetail.title || `Oportunidad ${value}`
    }
    if (selectedLabel) return selectedLabel
    const fromList = options.find((o) => o.id === value)
    if (fromList) return fromList.label
    if (valueDetail) {
      return valueDetail.contact_name || valueDetail.title || `Oportunidad ${value}`
    }
    return ''
  }, [lockedDetail, selectedLabel, options, value, valueDetail])

  useEffect(() => {
    if (!value) {
      setSelectedLabel('')
      return
    }
    if (lockedDetail) {
      setSelectedLabel(lockedDetail.contact_name || lockedDetail.title || '')
    }
  }, [value, lockedDetail])

  const handleSelect = (option: OpportunityReminderOption) => {
    onValueChange(option.id, option)
    setSelectedLabel(option.label)
    setSearch(option.label)
    setOpen(false)
  }

  const inputValue = disabled ? resolvedLabel : open ? search : resolvedLabel || search

  const showDropdown = open && !disabled
  const waitingDebounce =
    searchChars >= REMINDER_LEAD_SEARCH_MIN_CHARS && debouncedQ !== search.trim()
  const showHint = searchChars < REMINDER_LEAD_SEARCH_MIN_CHARS && !isFetching
  const showNeedMore = searchChars === 1

  return (
    <div ref={rootRef} className="relative">
      <Input
        value={inputValue}
        onChange={(e) => {
          const next = e.target.value
          setSearch(next)
          setOpen(true)
          if (!next.trim()) {
            onValueChange('')
            setSelectedLabel('')
          }
        }}
        onFocus={() => {
          if (disabled) return
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
      />

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[200] max-h-56 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          {showHint ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              Escribe las dos iniciales del lead (ej. <strong>CR</strong> para Camila Restrepo).
            </p>
          ) : null}

          {showNeedMore ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">Escribe una letra más…</p>
          ) : null}

          {waitingDebounce || (isFetching && canSearch) ? (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Buscando…
            </div>
          ) : null}

          {isError ? (
            <p className="text-destructive px-3 py-2 text-sm">Error al buscar leads</p>
          ) : null}

          {!isFetching &&
          !waitingDebounce &&
          !isError &&
          canSearch &&
          options.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              Ningún lead con iniciales «{debouncedQ.toUpperCase()}»
            </p>
          ) : null}

          {!isFetching && !waitingDebounce && options.length > 0 ? (
            <ul className="p-1">
              {options.map((option) => {
                const displayLabel = formatLeadLabel(option.label, debouncedQ)
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === option.id}
                      className={cn(
                        'hover:bg-accent hover:text-accent-foreground flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left text-sm',
                        value === option.id && 'bg-accent/60',
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(option)}
                    >
                      <span className="flex w-full items-center gap-2">
                        <Check
                          className={cn(
                            'size-4 shrink-0',
                            value === option.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="truncate font-medium">{displayLabel}</span>
                      </span>
                      {option.subtitle ? (
                        <span className="text-muted-foreground pl-6 text-xs">{option.subtitle}</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
