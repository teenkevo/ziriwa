'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/features/members/components/data-table-column-header'
import { DataTableFacetedFilter } from '@/features/members/components/data-table-faceted-filter'
import { OfficerSwitcher, type Officer } from './officer-switcher'
import type { SprintTask } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

const PRIORITIES = [
  { label: 'Highest', value: 'highest' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Lowest', value: 'lowest' },
]

const TASK_STATUSES = [
  { label: 'To do', value: 'to_do' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'In review', value: 'in_review' },
  { label: 'Done', value: 'done' },
]

export type AcceptedSprintTask = SprintTask & {
  sprintId: string
  weekLabel: string
  weekStart: string
  weekEnd: string
}

interface SprintTasksTableProps {
  tasks: AcceptedSprintTask[]
  officers: Officer[]
  sectionId: string
  selectedTaskKey: string | null
  onSelectTask: (key: string | null) => void
  onUpdateTask: (sprintId: string, taskKey: string, updates: Record<string, unknown>) => void
  isSaving: boolean
}

export function SprintTasksTable({
  tasks,
  officers,
  sectionId,
  selectedTaskKey,
  onSelectTask,
  onUpdateTask,
  isSaving,
}: SprintTasksTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const hasSubmissions = React.useCallback(
    (task: AcceptedSprintTask) =>
      (task.workSubmissions ?? []).length > 0,
    [],
  )

  const columns = React.useMemo<ColumnDef<AcceptedSprintTask>[]>(
    () => [
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Task' />
        ),
        cell: ({ row }) => (
          <div className='min-w-[220px]'>
            <span className='block break-words text-sm'>
              {row.original.description || '—'}
            </span>
            <span className='text-xs text-muted-foreground'>
              {row.original.weekLabel}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Priority' />
        ),
        cell: ({ row }) => (
          <Select
            value={row.original.priority ?? 'medium'}
            onValueChange={v =>
              onUpdateTask(row.original.sprintId, row.original._key, { priority: v })
            }
            disabled={isSaving}
          >
            <SelectTrigger
              className='h-9 w-[120px]'
              onClick={e => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'assignee',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Assignee' />
        ),
        cell: ({ row }) => {
          const locked = hasSubmissions(row.original)
          return (
            <div onClick={e => e.stopPropagation()}>
              <OfficerSwitcher
                officers={officers}
                value={row.original.assignee ?? null}
                onChange={id =>
                  onUpdateTask(row.original.sprintId, row.original._key, {
                    assignee: id,
                  })
                }
                disabled={isSaving || locked}
                placeholder='Select officer'
                sectionId={sectionId}
              />
            </div>
          )
        },
        accessorFn: row => {
          const o = officers.find(x => x._id === row.assignee)
          return o?.fullName ?? row.assigneeName ?? ''
        },
      },
      {
        accessorKey: 'taskStatus',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => {
          const status = row.original.taskStatus ?? 'to_do'
          const label = TASK_STATUSES.find(s => s.value === status)?.label ?? status
          const variant =
            status === 'done'
              ? 'default'
              : status === 'in_review'
                ? 'secondary'
                : 'outline'
          return (
            <Badge variant={variant as 'default' | 'secondary' | 'outline'} className='text-xs'>
              {label}
            </Badge>
          )
        },
        filterFn: (row, id, value) => value.includes(row.original.taskStatus ?? 'to_do'),
      },
    ],
    [officers, sectionId, onUpdateTask, isSaving, hasSubmissions],
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex flex-1 flex-wrap items-center gap-2'>
          <div className='relative flex-1 sm:max-w-[280px]'>
            <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search tasks...'
              value={
                (table.getColumn('description')?.getFilterValue() as string) ?? ''
              }
              onChange={e =>
                table.getColumn('description')?.setFilterValue(e.target.value)
              }
              className='h-9 pl-8'
            />
          </div>
          {table.getColumn('priority') && (
            <DataTableFacetedFilter
              column={table.getColumn('priority')}
              title='Priority'
              options={PRIORITIES}
            />
          )}
          {table.getColumn('taskStatus') && (
            <DataTableFacetedFilter
              column={table.getColumn('taskStatus')}
              title='Status'
              options={TASK_STATUSES}
            />
          )}
          {isFiltered && (
            <Button
              variant='ghost'
              onClick={() => table.resetColumnFilters()}
              className='h-8 px-2 lg:px-3'
            >
              Reset
              <X className='ml-2 h-4 w-4' />
            </Button>
          )}
        </div>
      </div>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={index === 0 ? 'min-w-[280px] pl-4' : undefined}
                  >
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.original._key}
                  className='cursor-pointer'
                  data-state={
                    row.original._key === selectedTaskKey
                      ? 'selected'
                      : undefined
                  }
                  onClick={() =>
                    onSelectTask(
                      row.original._key === selectedTaskKey
                        ? null
                        : row.original._key,
                    )
                  }
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
                  colSpan={table.getAllColumns().length}
                  className='h-24 text-center text-muted-foreground'
                >
                  No accepted tasks yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getFilteredRowModel().rows.length > 10 && (
        <div className='flex items-center justify-between px-2'>
          <div className='text-sm text-muted-foreground'>
            {table.getFilteredRowModel().rows.length} task(s)
          </div>
          <div className='flex items-center space-x-6'>
            <div className='flex items-center space-x-2'>
              <p className='text-sm font-medium'>Rows per page</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={v => table.setPageSize(Number(v))}
              >
                <SelectTrigger className='h-8 w-[70px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side='top'>
                  {[10, 20, 30, 40, 50].map(pageSize => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center justify-center text-sm font-medium'>
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            <div className='flex items-center space-x-2'>
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
        </div>
      )}
    </div>
  )
}
