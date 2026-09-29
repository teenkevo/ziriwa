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
import { format, parseISO } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { CascadeAssigneeOption } from '@/lib/contract-cascade/types'
import type { MeasurableActivity } from '@/sanity/lib/section-contracts/get-section-contract'

const ACTIVITY_TYPES = [
  { label: 'Core', value: 'core' },
  { label: 'Cross-cutting', value: 'cross-cutting' },
  { label: 'KPI', value: 'kpi' },
  { label: 'Measurable', value: 'measurable' },
]

const ACTIVITY_STATUSES = [
  { label: 'Not started', value: 'not_started' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
]

function typeLabel(value: string | undefined) {
  return ACTIVITY_TYPES.find(t => t.value === value)?.label ?? value ?? '—'
}

function ActivityAssigneesCell({
  activity,
  options,
  emptyLabel,
  disabled,
  onChange,
}: {
  activity: MeasurableActivityRow
  options: CascadeAssigneeOption[]
  emptyLabel: string
  disabled: boolean
  onChange: (assigneeIds: string[]) => void
}) {
  const selectedIds = (activity.assignees ?? [])
    .map(person => person._id)
    .filter(Boolean)
  const known = new Map(options.map(person => [person._id, person.fullName]))
  for (const person of activity.assignees ?? []) {
    if (person._id && !known.has(person._id)) {
      known.set(person._id, person.fullName?.trim() || 'Staff')
    }
  }
  const choices = [...known.entries()].map(([id, fullName]) => ({
    _id: id,
    fullName,
  }))
  const label =
    selectedIds.length === 0
      ? 'Assign'
      : selectedIds
          .map(id => known.get(id) ?? 'Staff')
          .join(', ')

  if (disabled) {
    return (
      <span className='block max-w-[14rem] text-xs text-muted-foreground'>
        {selectedIds.length === 0 ? '—' : label}
      </span>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-9 max-w-[14rem] justify-start truncate text-xs font-normal'
          onClick={event => event.stopPropagation()}
        >
          <span className='truncate'>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-64 p-2'
        onClick={event => event.stopPropagation()}
      >
        {choices.length === 0 ? (
          <p className='px-2 py-1.5 text-xs text-muted-foreground'>{emptyLabel}</p>
        ) : (
          <div className='flex max-h-56 flex-col gap-1 overflow-y-auto'>
            {choices.map(person => {
              const checked = selectedIds.includes(person._id)
              return (
                <label
                  key={person._id}
                  className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted'
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={value => {
                      const next = value
                        ? [...selectedIds, person._id]
                        : selectedIds.filter(id => id !== person._id)
                      onChange([...new Set(next)])
                    }}
                  />
                  <span className='min-w-0 truncate'>{person.fullName}</span>
                </label>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function statusLabel(value: string | undefined) {
  return (
    ACTIVITY_STATUSES.find(s => s.value === value)?.label ??
    (value || 'not_started').replaceAll('_', ' ')
  )
}

function formatActivityDueDate(value: string | undefined) {
  if (!value?.trim()) return '—'
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return format(parsed, 'dd MMM yyyy')
}

export type MeasurableActivityRow = MeasurableActivity

interface MeasurableActivitiesTableProps {
  activities: MeasurableActivityRow[]
  selectedActivityKey: string | null
  onSelectActivity: (key: string | null) => void
  onUpdateActivity: (
    key: string,
    updates: Partial<Pick<MeasurableActivity, 'title' | 'status' | 'activityType'>>,
  ) => void
  onRemoveActivity: (key: string) => void | Promise<void>
  /** Staff one level below. Null hides the column (officer contracts). */
  assigneeOptions?: CascadeAssigneeOption[] | null
  assigneeEmptyLabel?: string
  onAssigneesChange?: (key: string, assigneeIds: string[]) => void
  isSaving: boolean
  canManage: boolean
}

export function MeasurableActivitiesTable({
  activities,
  selectedActivityKey,
  onSelectActivity,
  onUpdateActivity,
  onRemoveActivity,
  assigneeOptions = null,
  assigneeEmptyLabel = 'No staff on the level below yet.',
  onAssigneesChange,
  isSaving,
  canManage,
}: MeasurableActivitiesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [deleteKey, setDeleteKey] = React.useState<string | null>(null)

  const columns = React.useMemo<ColumnDef<MeasurableActivityRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Measurable activity' />
        ),
        cell: ({ row }) => (
          <span className='min-w-[200px] text-xs block break-words'>
            {row.original.title || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'activityType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Type' />
        ),
        cell: ({ row }) => (
          <Select
            value={row.original.activityType}
            onValueChange={v =>
              onUpdateActivity(row.original._key, {
                activityType: v as MeasurableActivity['activityType'],
              })
            }
            disabled={isSaving || !canManage}
          >
            <SelectTrigger
              className='h-9 w-[140px] text-xs'
              onClick={e => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='text-xs'>
              <SelectItem value='core' className='text-xs'>
                Core
              </SelectItem>
              <SelectItem value='cross-cutting' className='text-xs'>
                Cross-cutting
              </SelectItem>
            </SelectContent>
          </Select>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
        accessorFn: row => row.activityType,
      },
      ...(assigneeOptions
        ? [
            {
              id: 'assignees',
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title='Assignees' />
              ),
              cell: ({ row }) => (
                <ActivityAssigneesCell
                  activity={row.original}
                  options={assigneeOptions}
                  emptyLabel={assigneeEmptyLabel}
                  disabled={isSaving || !canManage}
                  onChange={ids => onAssigneesChange?.(row.original._key, ids)}
                />
              ),
              enableSorting: false,
            } satisfies ColumnDef<MeasurableActivityRow>,
          ]
        : []),
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => (
          <Select
            value={row.original.status || 'not_started'}
            onValueChange={v =>
              onUpdateActivity(row.original._key, { status: v })
            }
            disabled={isSaving || !canManage}
          >
            <SelectTrigger
              className='h-9 w-[130px] text-xs'
              onClick={e => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='text-xs'>
              {ACTIVITY_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value} className='text-xs'>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
        accessorFn: row => row.status || 'not_started',
      },
      {
        accessorKey: 'targetDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Due date' />
        ),
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-xs text-muted-foreground'>
            {formatActivityDueDate(row.original.targetDate)}
          </span>
        ),
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              cell: ({ row }: { row: { original: MeasurableActivityRow } }) => (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-destructive'
                  disabled={isSaving}
                  onClick={e => {
                    e.stopPropagation()
                    setDeleteKey(row.original._key)
                  }}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              ),
            } as ColumnDef<MeasurableActivityRow>,
          ]
        : []),
    ],
    [
      assigneeEmptyLabel,
      assigneeOptions,
      canManage,
      isSaving,
      onAssigneesChange,
      onUpdateActivity,
    ],
  )

  const table = useReactTable({
    data: activities,
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
    getRowId: row => row._key,
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <>
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex flex-1 flex-wrap items-center gap-2'>
            <div className='relative flex-1 sm:max-w-[280px]'>
              <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search for an activity'
                value={
                  (table.getColumn('title')?.getFilterValue() as string) ?? ''
                }
                onChange={e =>
                  table.getColumn('title')?.setFilterValue(e.target.value)
                }
                className='h-9 pl-8'
              />
            </div>
            {table.getColumn('activityType') && (
              <DataTableFacetedFilter
                column={table.getColumn('activityType')}
                title='Filter by Type'
                options={ACTIVITY_TYPES.map(t => ({
                  label: t.label,
                  value: t.value,
                }))}
              />
            )}
            {table.getColumn('status') && (
              <DataTableFacetedFilter
                column={table.getColumn('status')}
                title='Filter by Status'
                options={ACTIVITY_STATUSES.map(s => ({
                  label: s.label,
                  value: s.value,
                }))}
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
                      className={index === 0 ? ' pl-2' : undefined}
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
                      row.original._key === selectedActivityKey
                        ? 'selected'
                        : undefined
                    }
                    onClick={() =>
                      onSelectActivity(
                        row.original._key === selectedActivityKey
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
                    No measurable activities yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className='flex items-center justify-between px-2'>
          <div className='text-sm text-muted-foreground'>
            {table.getFilteredRowModel().rows.length} activity(ies)
          </div>
          <div className='flex items-center space-x-6 lg:space-x-8'>
            <div className='flex items-center space-x-2'>
              <p className='text-sm font-medium'>Rows per page</p>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={value => table.setPageSize(Number(value))}
              >
                <SelectTrigger className='h-8 w-[70px]'>
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
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
            <div className='flex w-[100px] items-center justify-center text-sm font-medium'>
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount() || 1}
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                className='hidden h-8 w-8 p-0 lg:flex'
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='hidden h-8 w-8 p-0 lg:flex'
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={deleteKey !== null}
        onOpenChange={open => !open && setDeleteKey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete measurable activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this measurable activity and its
              evidence. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={e => {
                e.preventDefault()
                if (!deleteKey) return
                void onRemoveActivity(deleteKey)
                setDeleteKey(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { typeLabel as measurableActivityTypeLabel, statusLabel as measurableActivityStatusLabel }
