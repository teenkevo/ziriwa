'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type RowSelectionState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'

export type SectionRow = {
  _id: string
  name: string
  slug?: { current: string }
  order?: number
  manager?: { _id: string; fullName: string }
  staffCount?: number
  initiativeProgressPercent: number
  initiativeProgressCompleted: number
  initiativeProgressTotal: number
}

function sectionGlobalFilter(
  row: Row<SectionRow>,
  _columnId: string,
  filterValue: unknown,
): boolean {
  const q = String(filterValue ?? '')
    .toLowerCase()
    .trim()
  if (!q) return true
  const s = row.original
  const hay = [s.name, s.manager?.fullName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function InitiativeProgressCell({
  percent,
  completed,
  total,
}: {
  percent: number
  completed: number
  total: number
}) {
  return (
    <div className='flex min-w-[148px] max-w-[240px] flex-col gap-1'>
      <div className='flex items-center justify-between gap-2 text-[10px] text-muted-foreground'>
        <span>
          {total === 0 ? 'No activities' : `${completed}/${total} done`}
        </span>
        <span>{total === 0 ? '—' : `${percent}%`}</span>
      </div>
      <Progress value={total === 0 ? 0 : percent} className='h-1' />
    </div>
  )
}

function buildColumns(
  allowActions: boolean,
  onEdit: (s: SectionRow) => void,
  onDelete: (s: SectionRow) => void,
): ColumnDef<SectionRow>[] {
  const cols: ColumnDef<SectionRow>[] = []

  if (allowActions) {
    cols.push({
      id: 'select',
      header: ({ table }) => {
        const rows = table.getFilteredRowModel().rows
        const allSelected =
          rows.length > 0 && rows.every(r => r.getIsSelected())
        const someSelected = rows.some(r => r.getIsSelected())
        return (
          <div className='flex items-center justify-center'>
            <Checkbox
              checked={
                allSelected ? true : someSelected ? 'indeterminate' : false
              }
              onCheckedChange={() => {
                const next = !allSelected
                rows.forEach(r => r.toggleSelected(next))
              }}
              aria-label='Select all'
            />
          </div>
        )
      },
      cell: ({ row }) => (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={v => row.toggleSelected(!!v)}
            aria-label={`Select ${row.original.name}`}
          />
        </div>
      ),
      enableSorting: false,
      size: 40,
    })
  }

  cols.push(
    {
      accessorKey: 'name',
      header: 'Section',
      cell: ({ row }) => {
        const s = row.original
        const href = `/sections/${s.slug?.current ?? s._id}`
        return (
          <Link
            href={href}
            prefetch={false}
            className='font-medium hover:underline'
          >
            {s.name}
          </Link>
        )
      },
    },
    {
      id: 'manager',
      header: 'Manager',
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.manager?.fullName ?? '—'}
        </span>
      ),
    },
    {
      id: 'progress',
      header: 'Progress on initiatives',
      cell: ({ row }) => {
        const s = row.original
        return (
          <InitiativeProgressCell
            percent={s.initiativeProgressPercent}
            completed={s.initiativeProgressCompleted}
            total={s.initiativeProgressTotal}
          />
        )
      },
    },
    {
      id: 'staff',
      header: () => <div className='text-right'>Staff</div>,
      cell: ({ row }) => (
        <div className='text-right tabular-nums text-sm'>
          {row.original.staffCount ?? 0}
        </div>
      ),
    },
  )

  if (allowActions) {
    cols.push({
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className='text-right'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground'
                >
                  <MoreVertical className='h-4 w-4' />
                  <span className='sr-only'>Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44'>
                <DropdownMenuItem onClick={() => onEdit(s)}>
                  <Pencil className='h-4 w-4 mr-2' />
                  Edit section
                </DropdownMenuItem>
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => onDelete(s)}
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    })
  }

  return cols
}

export function DivisionSectionsTable({
  data,
  allowSectionActions,
  onEditSection,
  onDeleteSection,
  onBulkDeleteSections,
}: {
  data: SectionRow[]
  allowSectionActions: boolean
  onEditSection: (s: SectionRow) => void
  onDeleteSection: (s: SectionRow) => void
  onBulkDeleteSections?: (ids: string[]) => void
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  const columns = React.useMemo(
    () => buildColumns(allowSectionActions, onEditSection, onDeleteSection),
    [allowSectionActions, onEditSection, onDeleteSection],
  )

  React.useEffect(() => {
    setRowSelection({})
  }, [data])

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      globalFilter,
    },
    enableRowSelection: allowSectionActions,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: sectionGlobalFilter,
    getRowId: row => row._id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    autoResetPageIndex: true,
  })

  const selectedIds = table.getSelectedRowModel().rows.map(r => r.original._id)
  const selectedCount = selectedIds.length

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <Input
          placeholder='Search by section or manager…'
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className='max-w-md'
          aria-label='Search sections'
        />
        {allowSectionActions && selectedCount > 0 && onBulkDeleteSections && (
          <Button
            variant='destructive'
            size='sm'
            className='shrink-0'
            onClick={() => onBulkDeleteSections(selectedIds)}
          >
            <Trash2 className='h-4 w-4 mr-2' />
            Delete selected sections ({selectedCount})
          </Button>
        )}
      </div>

      <div className='overflow-x-auto overflow-hidden rounded-lg border'>
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-muted'>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  {data.length === 0
                    ? 'No sections yet.'
                    : 'No sections match your search.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 0 && (
        <div className='flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-muted-foreground'>
            {table.getFilteredRowModel().rows.length} section
            {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
            {globalFilter.trim() ? ' (filtered)' : ''}
          </p>
          <div className='flex flex-wrap items-center justify-end gap-6 sm:gap-8'>
            <div className='flex items-center gap-2'>
              <Label htmlFor='sections-rows' className='text-sm font-medium'>
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={v => table.setPageSize(Number(v))}
              >
                <SelectTrigger
                  className='h-8 w-[4.5rem] text-xs'
                  id='sections-rows'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side='top'>
                  {[10, 20, 30, 50].map(n => (
                    <SelectItem key={n} value={`${n}`}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2 text-sm font-medium'>
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {Math.max(1, table.getPageCount())}
            </div>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                className='hidden h-8 w-8 p-0 sm:flex'
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className='sr-only'>First page</span>
                <ChevronsLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className='sr-only'>Previous page</span>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className='sr-only'>Next page</span>
                <ChevronRight className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='hidden h-8 w-8 p-0 sm:flex'
                onClick={() =>
                  table.setPageIndex(Math.max(0, table.getPageCount() - 1))
                }
                disabled={!table.getCanNextPage()}
              >
                <span className='sr-only'>Last page</span>
                <ChevronsRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
