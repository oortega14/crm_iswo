import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronDown, Settings2 } from 'lucide-react'
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  getBantScoreColor,
  getStatusColor,
  formatStatusLabel,
  getInitials,
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Opportunity } from '@/types'

interface OpportunitiesTableProps {
  opportunities: Opportunity[]
  onSelectOpportunity: (id: string) => void
}

const columnHelper = createColumnHelper<Opportunity>()

export function OpportunitiesTable({
  opportunities,
  onSelectOpportunity,
}: OpportunitiesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    id: false,
    pipeline_id: false,
    owner_id: false,
  })
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('contact_name', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Contacto
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-medium">{info.getValue()}</span>
            {info.row.original.company_name && (
              <span className="text-xs text-muted-foreground">
                {info.row.original.company_name}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('estimated_value', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Valor
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: (info) => (
          <span className="font-mono">
            {formatCurrency(info.getValue(), info.row.original.currency)}
          </span>
        ),
      }),
      columnHelper.accessor('stage', {
        header: 'Etapa',
        cell: (info) => {
          const stage = info.getValue()
          return stage ? (
            <Badge variant="outline" className="font-normal">
              {stage.name}
            </Badge>
          ) : null
        },
      }),
      columnHelper.accessor('bant_score', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            BANT
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: (info) => {
          const score = info.getValue()
          return (
            <Badge className={cn('font-mono', getBantScoreColor(score))}>
              {score}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => (
          <Badge variant="secondary" className={cn(getStatusColor(info.getValue()))}>
            {formatStatusLabel(info.getValue())}
          </Badge>
        ),
      }),
      columnHelper.accessor('owner', {
        header: 'Propietario',
        cell: (info) => {
          const owner = info.getValue()
          if (!owner) return null
          return (
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarImage src={owner.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(owner.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate max-w-[100px]">{owner.name}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('last_activity_at', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Última actividad
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: (info) => {
          const date = info.getValue()
          return date ? (
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(date)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        },
      }),
    ],
    []
  )

  const table = useReactTable({
    data: opportunities,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b lg:px-6">
        <Input
          placeholder="Buscar oportunidades..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto gap-1.5">
              <Settings2 className="size-4" />
              Columnas
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-sm"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hay oportunidades
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onSelectOpportunity(row.original.id)}
                  className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t lg:px-6">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} oportunidad(es)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
