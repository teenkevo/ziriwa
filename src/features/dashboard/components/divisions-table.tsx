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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

export type DivisionRow = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  department?: { _id: string }
  assistantCommissioner?: { _id: string; fullName?: string }
  staffCount?: number
  /** 0–100, current FY measurable activities completed / total */
  initiativeProgressPercent: number
  initiativeProgressCompleted: number
  initiativeProgressTotal: number
  /** Section names under this division (search). */
  sectionNames?: string[]
}

function divisionGlobalFilter(
  row: Row<DivisionRow>,
  _columnId: string,
  filterValue: unknown,
): boolean {
  const q = String(filterValue ?? '')
    .toLowerCase()
    .trim()
  if (!q) return true
  const r = row.original
  const hay = [
    r.fullName,
    r.name,
    r.acronym,
    r.assistantCommissioner?.fullName,
    ...(r.sectionNames ?? []),
  ]
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
  canManage: boolean,
  onEdit: (row: DivisionRow) => void,
  onDelete: (row: DivisionRow) => void,
): ColumnDef<DivisionRow>[] {
  const cols: ColumnDef<DivisionRow>[] = [
    {
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
            aria-label={`Select ${row.original.fullName ?? row.original.name}`}
          />
        </div>
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: 'fullName',
      header: 'Division',
      cell: ({ row }) => {
        const div = row.original
        const label = div.fullName || div.name
        const href = `/divisions/${div.slug?.current ?? div._id}`
        return (
          <Link
            href={href}
            prefetch={false}
            className='font-medium hover:underline'
          >
            {label}
          </Link>
        )
      },
    },
    {
      accessorKey: 'acronym',
      header: 'Acronym',
      cell: ({ row }) => (
        <span className='text-muted-foreground'>
          {row.original.acronym?.trim() ? (
            <Badge variant='outline' className='font-normal'>
              {row.original.acronym}
            </Badge>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      id: 'ac',
      header: 'Assistant Commissioner',
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {row.original.assistantCommissioner?.fullName?.trim() || '—'}
        </span>
      ),
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
    {
      id: 'progress',
      header: 'Progress on initiatives',
      cell: ({ row }) => {
        const d = row.original
        return (
          <InitiativeProgressCell
            percent={d.initiativeProgressPercent}
            completed={d.initiativeProgressCompleted}
            total={d.initiativeProgressTotal}
          />
        )
      },
    },
  ]

  cols.push({
    id: 'actions',
    header: () => <span className='sr-only'>Actions</span>,
    cell: ({ row }) => {
      const div = row.original
      const href = `/divisions/${div.slug?.current ?? div._id}`
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
              <DropdownMenuItem asChild>Actions</DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(div)}>
                    <Pencil className='h-4 w-4 mr-2' />
                    Edit division
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='text-destructive focus:text-destructive'
                    onClick={() => onDelete(div)}
                  >
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete division
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  })

  return cols
}

export function DivisionsTable({
  data,
  canManageDivisions,
  onEditDivision,
  onDeleteDivision,
  onBulkDeleteDivisions,
}: {
  data: DivisionRow[]
  canManageDivisions: boolean
  onEditDivision: (row: DivisionRow) => void
  onDeleteDivision: (row: DivisionRow) => void
  /** Called with selected division ids when user confirms bulk delete from parent. */
  onBulkDeleteDivisions?: (ids: string[]) => void
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  const columns = React.useMemo(
    () => buildColumns(canManageDivisions, onEditDivision, onDeleteDivision),
    [canManageDivisions, onEditDivision, onDeleteDivision],
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
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: divisionGlobalFilter,
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
          placeholder='Search by division, acronym, commissioner, or section…'
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className='max-w-md'
          aria-label='Search divisions'
        />
        {canManageDivisions && selectedCount > 0 && onBulkDeleteDivisions && (
          <Button
            variant='destructive'
            size='sm'
            className='shrink-0'
            onClick={() => onBulkDeleteDivisions(selectedIds)}
          >
            <Trash2 className='h-4 w-4 mr-2' />
            Delete selected divisions ({selectedCount})
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
                    ? 'No divisions yet.'
                    : 'No divisions match your search.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 0 && (
        <div className='flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-muted-foreground'>
            {table.getFilteredRowModel().rows.length} division
            {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
            {globalFilter.trim() ? ' (filtered)' : ''}
          </p>
          <div className='flex flex-wrap items-center justify-end gap-6 sm:gap-8'>
            <div className='flex items-center gap-2'>
              <Label htmlFor='divisions-rows' className='text-sm font-medium'>
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={v => table.setPageSize(Number(v))}
              >
                <SelectTrigger
                  className='h-8 w-[4.5rem] text-xs'
                  id='divisions-rows'
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
