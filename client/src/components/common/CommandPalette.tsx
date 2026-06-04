import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Target, Users, FileText } from 'lucide-react'
import { useAuthStore, useTenant } from '@/stores/auth'
import { isPlatformTenant } from '@/lib/platformTenant'
import { filterMainNav, filterSettingsNav, MAIN_NAV_ITEMS } from '@/lib/settingsNav'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { queryKeys } from '@/lib/queryClient'
import api from '@/lib/api'
import { debounce } from '@/lib/utils'
import type { SearchResult } from '@/types'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const tenant = useTenant()

  const platform = isPlatformTenant(tenant)

  const pages = useMemo(
    () => [
      ...filterMainNav(MAIN_NAV_ITEMS, user?.role, tenant).map((item) => ({
        title: item.label,
        href: item.href,
        icon: item.icon,
      })),
      ...filterSettingsNav(user?.role, tenant).map((item) => ({
        title: item.title,
        href: item.href,
        icon: item.icon,
      })),
    ],
    [user?.role, tenant],
  )
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((value: string) => setDebouncedSearch(value), 300),
    []
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    debouncedSetSearch(value)
  }

  // Search API
  const { data: searchResults, isLoading, error: searchError } = useQuery({
    queryKey: queryKeys.search(debouncedSearch),
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return []
      const response = await api.get<{ data: SearchResult[] }>(
        `/search?q=${encodeURIComponent(debouncedSearch)}`
      )
      return response.data.data ?? []
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 0,
  })

  const handleSelect = (href: string) => {
    onOpenChange(false)
    setSearch('')
    setDebouncedSearch('')
    navigate({ to: href })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return Target
      case 'contact':
        return Users
      default:
        return FileText
    }
  }

  // Filter pages by search
  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} commandProps={{ shouldFilter: false }}>
      <CommandInput
        placeholder={
          platform
            ? 'Buscar páginas de plataforma...'
            : 'Buscar oportunidades, contactos o páginas...'
        }
        value={search}
        onValueChange={handleSearchChange}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading
            ? 'Buscando...'
            : searchError
              ? 'Error al buscar. Intenta de nuevo.'
              : 'No se encontraron resultados.'}
        </CommandEmpty>

        {/* Search results — solo tenants comerciales (RFC F5) */}
        {!platform && searchResults && searchResults.length > 0 && (
          <CommandGroup heading="Resultados">
            {searchResults.map((result) => {
              const Icon = getIcon(result.type)
              const go = (): void => {
                onOpenChange(false)
                setSearch('')
                setDebouncedSearch('')
                if (result.type === 'opportunity') {
                  navigate({
                    to: '/opportunities',
                    search: (prev) => ({
                      ...prev,
                      selected: result.id,
                    }),
                  })
                  return
                }
                if (result.type === 'contact') {
                  navigate({
                    to: '/contacts',
                    search: { selected: result.id },
                  })
                  return
                }
                navigate({ to: result.url })
              }
              return (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={go}
                  className="flex items-center gap-3"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {/* Pages */}
        {filteredPages.length > 0 && (
          <CommandGroup heading="Páginas">
            {filteredPages.map((page) => (
              <CommandItem
                key={page.href}
                onSelect={() => handleSelect(page.href)}
                className="flex items-center gap-3"
              >
                <page.icon className="size-4 text-muted-foreground" />
                <span>{page.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
