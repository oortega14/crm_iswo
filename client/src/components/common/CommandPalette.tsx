import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Search, Target, Users, FileText, LayoutDashboard } from 'lucide-react'
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

const pages = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Oportunidades', href: '/opportunities', icon: Target },
  { title: 'Contactos', href: '/contacts', icon: Users },
  { title: 'Recordatorios', href: '/reminders', icon: Target },
  { title: 'Red de Referidos', href: '/network', icon: Target },
  { title: 'Configuración de Pipelines', href: '/settings/pipelines', icon: Target },
  { title: 'Usuarios', href: '/settings/users', icon: Users },
  { title: 'Integraciones', href: '/settings/integrations', icon: Target },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
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
  const { data: searchResults, isLoading } = useQuery({
    queryKey: queryKeys.search(debouncedSearch),
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return []
      const response = await api.get<{ data: SearchResult[] }>(
        `/search?q=${encodeURIComponent(debouncedSearch)}`
      )
      return response.data.data
    },
    enabled: debouncedSearch.length >= 2,
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
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar oportunidades, contactos o páginas..."
        value={search}
        onValueChange={handleSearchChange}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? 'Buscando...' : 'No se encontraron resultados.'}
        </CommandEmpty>

        {/* Search results */}
        {searchResults && searchResults.length > 0 && (
          <CommandGroup heading="Resultados">
            {searchResults.map((result) => {
              const Icon = getIcon(result.type)
              return (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(result.url)}
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
