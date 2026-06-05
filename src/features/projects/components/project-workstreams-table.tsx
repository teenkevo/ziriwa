'use client'

import * as React from 'react'
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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export interface ProjectWorkstreamRow {
  _id: string
  name: string
  slug?: string | null
  workstreamLeadId?: string | null
  workstreamLeadName?: string | null
  workstreamLeadEmail?: string | null
  memberNames?: string[]
}

function formatMemberNames(names: string[] | undefined): string {
  const list = (names ?? []).map(n => n?.trim()).filter(Boolean) as string[]
  if (list.length === 0) return 'No members'
  return list.join(', ')
}

function workstreamGlobalFilter(
  row: Row<ProjectWorkstreamRow>,
  _columnId: string,
  filterValue: unknown,
): boolean {
  const q = String(filterValue ?? '')
    .toLowerCase()
    .trim()
  if (!q) return true
  const ws = row.original
  const hay = [ws.name, ws.workstreamLeadName, ws.workstreamLeadEmail, ...(ws.memberNames ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function buildColumns(
  allowActions: boolean,
  onEdit: (row: ProjectWorkstreamRow) => void,
  onDelete: (row: ProjectWorkstreamRow) => void,
): ColumnDef<ProjectWorkstreamRow>[] {
  const cols: ColumnDef<ProjectWorkstreamRow>[] = []

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
              onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
              aria-label='Select all workstreams'
            />
          </div>
        )
      },
      cell: ({ row }) => (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.name}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }

  cols.push(
    {
      accessorKey: 'name',
      header: 'Workstream',
      cell: ({ row }) => (
        <span className='font-medium'>{row.original.name}</span>
      ),
    },
    {
      id: 'lead',
      header: 'Workstream lead',
      cell: ({ row }) => {
        const leadName = row.original.workstreamLeadName?.trim()
        const leadEmail = row.original.workstreamLeadEmail?.trim()
        if (!leadName) {
          return (
            <span className='text-sm text-muted-foreground'>
              No lead assigned
            </span>
          )
        }
        return (
          <div className='min-w-0'>
            <p className='truncate text-sm'>{leadName}</p>
            {leadEmail ? (
              <p className='truncate text-xs text-muted-foreground'>
                {leadEmail}
              </p>
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'members',
      header: 'Workstream members',
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {formatMemberNames(row.original.memberNames)}
        </span>
      ),
    },
  )

  cols.push({
    id: 'actions',
    header: () => <div className='text-right font-medium'>Actions</div>,
    cell: ({ row }) => {
      if (!allowActions) {
        return <span className='text-muted-foreground'>—</span>
      }
      const ws = row.original
      return (
        <div className='flex justify-end'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-muted-foreground'
              >
                <MoreVertical className='h-4 w-4' />
                <span className='sr-only'>Actions for {ws.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-40'>
              <DropdownMenuItem onClick={() => onEdit(ws)}>
                <Pencil className='h-4 w-4 mr-2' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => onDelete(ws)}
              >
                <Trash2 className='h-4 w-4 mr-2' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  })

  return cols
}

interface ProjectWorkstreamsTableProps {
  data: ProjectWorkstreamRow[]
  allowActions: boolean
  onEditWorkstream: (row: ProjectWorkstreamRow) => void
  onDeleteWorkstream: (row: ProjectWorkstreamRow) => void
  onBulkDeleteWorkstreams?: (ids: string[]) => void
}

export function ProjectWorkstreamsTable({
  data,
  allowActions,
  onEditWorkstream,
  onDeleteWorkstream,
  onBulkDeleteWorkstreams,
}: ProjectWorkstreamsTableProps) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  const columns = React.useMemo(
    () => buildColumns(allowActions, onEditWorkstream, onDeleteWorkstream),
    [allowActions, onEditWorkstream, onDeleteWorkstream],
  )

  React.useEffect(() => {
    setRowSelection({})
  }, [data])

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection, globalFilter },
    enableRowSelection: allowActions,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: workstreamGlobalFilter,
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
        <div className='flex flex-1 flex-col gap-2 sm:max-w-sm'>
          <Label htmlFor='workstreams-table-search' className='sr-only'>
            Search workstreams
          </Label>
          <Input
            id='workstreams-table-search'
            placeholder='Search workstreams…'
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
          />
        </div>
        {allowActions && selectedCount > 0 && onBulkDeleteWorkstreams ? (
          <Button
            variant='destructive'
            size='sm'
            className='shrink-0'
            onClick={() => onBulkDeleteWorkstreams(selectedIds)}
          >
            <Trash2 className='h-4 w-4 mr-2' />
            Delete selected ({selectedCount})
          </Button>
        ) : null}
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
                    ? 'No workstreams yet.'
                    : 'No workstreams match your search.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 ? (
        <div className='flex items-center justify-between gap-4'>
          <p className='text-sm text-muted-foreground'>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </p>
          <div className='flex items-center gap-2'>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={value => table.setPageSize(Number(value))}
            >
              <SelectTrigger className='h-8 w-[70px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30].map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
