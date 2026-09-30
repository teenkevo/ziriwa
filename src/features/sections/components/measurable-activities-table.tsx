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
  addDays,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ActivityAssigneesPicker } from '@/features/sections/components/activity-assignees-picker'
import { resolveAssigneeNames } from '@/lib/contract-cascade/assignee-names'
import { isCascadedItem } from '@/lib/contract-cascade/is-cascaded'
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

const ACTIVITY_DUE_WINDOWS = [
  { label: 'Due this week', value: 'week' },
  { label: 'Due this month', value: 'month' },
  { label: 'Due this quarter', value: 'quarter' },
]

/**
 * Windows an activity's due date falls into, cumulatively: anything due this
 * week is also due this month and this quarter. Undated and overdue activities
 * match no window. The work week runs Monday to Friday, so dates falling on a
 * weekend are never "due this week".
 */
function activityDueWindows(targetDate: string | undefined): string[] {
  if (!targetDate?.trim()) return []
  const parsed = parseISO(targetDate)
  if (Number.isNaN(parsed.getTime())) return []
  const now = new Date()
  const due = startOfDay(parsed)
  if (due < startOfDay(now)) return []
  const friday = endOfDay(addDays(startOfWeek(now, { weekStartsOn: 1 }), 4))
  const windows: string[] = []
  if (due <= friday) windows.push('week')
  if (due <= endOfMonth(now)) windows.push('month')
  if (due <= endOfQuarter(now)) windows.push('quarter')
  return windows
}

function typeLabel(value: string | undefined) {
  return ACTIVITY_TYPES.find(t => t.value === value)?.label ?? value ?? '—'
}

function CellSavingSpinner({ label }: { label: string }) {
  return (
    <Loader2
      className='h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground'
      aria-label={label}
    />
  )
}

function ActivityAssigneesCell({
  activity,
  options,
  emptyLabel,
  unassignedLabel,
  readOnly,
  saving,
  onChange,
}: {
  activity: MeasurableActivityRow
  options: CascadeAssigneeOption[]
  emptyLabel: string
  unassignedLabel: string
  readOnly: boolean
  saving: boolean
  onChange: (assigneeIds: string[]) => void
}) {
  if (readOnly) {
    const names = resolveAssigneeNames(activity.assignees, options)
    return (
      <span className='block max-w-[14rem] text-xs text-muted-foreground'>
        {names.length === 0 ? unassignedLabel : names.join(', ')}
      </span>
    )
  }

  return (
    <div className='flex items-center gap-2' aria-busy={saving}>
      <ActivityAssigneesPicker
        assignees={activity.assignees}
        options={options}
        emptyLabel={emptyLabel}
        unassignedLabel={unassignedLabel}
        triggerClassName='max-w-[14rem]'
        disabled={saving}
        onChange={onChange}
      />
      {saving ? <CellSavingSpinner label='Saving assignees' /> : null}
    </div>
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
  ) => void | Promise<void>
  onRemoveActivity: (key: string) => void | Promise<void>
  /** Staff one level below. Null hides the column (officer contracts). */
  assigneeOptions?: CascadeAssigneeOption[] | null
  assigneeEmptyLabel?: string
  /** Shown on an unassigned core activity. Names the role one level below. */
  unassignedLabel?: string
  onAssigneesChange?: (
    key: string,
    assigneeIds: string[],
  ) => void | Promise<void>
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
  unassignedLabel = 'Assign',
  onAssigneesChange,
  isSaving,
  canManage,
}: MeasurableActivitiesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [deleteKey, setDeleteKey] = React.useState<string | null>(null)
  /** Which cell is mid-save, so only that row shows a spinner. */
  const [pendingEdit, setPendingEdit] = React.useState<{
    key: string
    field: 'activityType' | 'status' | 'assignees'
  } | null>(null)

  const isPending = React.useCallback(
    (key: string, field: 'activityType' | 'status' | 'assignees') =>
      pendingEdit?.key === key && pendingEdit.field === field,
    [pendingEdit],
  )

  const runUpdate = React.useCallback(
    async (
      key: string,
      field: 'activityType' | 'status',
      updates: Partial<
        Pick<MeasurableActivity, 'status' | 'activityType'>
      >,
    ) => {
      setPendingEdit({ key, field })
      try {
        await onUpdateActivity(key, updates)
      } finally {
        setPendingEdit(null)
      }
    },
    [onUpdateActivity],
  )

  const runAssigneesUpdate = React.useCallback(
    async (key: string, assigneeIds: string[]) => {
      setPendingEdit({ key, field: 'assignees' })
      try {
        await onAssigneesChange?.(key, assigneeIds)
      } finally {
        setPendingEdit(null)
      }
    },
    [onAssigneesChange],
  )

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
        cell: ({ row }) => {
          const typeLocked =
            (row.original.assignees?.length ?? 0) > 0 &&
            row.original.activityType !== 'cross-cutting'
          const saving = isPending(row.original._key, 'activityType')
          return (
            <div className='flex items-center gap-2' aria-busy={saving}>
              <Select
                value={row.original.activityType}
                onValueChange={v =>
                  void runUpdate(row.original._key, 'activityType', {
                    activityType: v as MeasurableActivity['activityType'],
                  })
                }
                disabled={
                  isSaving ||
                  !canManage ||
                  isCascadedItem(row.original) ||
                  typeLocked
                }
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
              {saving ? <CellSavingSpinner label='Saving type' /> : null}
            </div>
          )
        },
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
              cell: ({ row }) =>
                row.original.activityType === 'cross-cutting' ? (
                  <span className='block max-w-[14rem] text-xs text-muted-foreground'>
                    Owned at this level
                  </span>
                ) : (
                  <ActivityAssigneesCell
                    activity={row.original}
                    options={assigneeOptions}
                    emptyLabel={assigneeEmptyLabel}
                    unassignedLabel={unassignedLabel}
                    readOnly={!canManage || isCascadedItem(row.original)}
                    saving={isPending(row.original._key, 'assignees')}
                    onChange={ids =>
                      void runAssigneesUpdate(row.original._key, ids)
                    }
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
        cell: ({ row }) => {
          const saving = isPending(row.original._key, 'status')
          return (
            <div className='flex items-center gap-2' aria-busy={saving}>
              <Select
                value={row.original.status || 'not_started'}
                onValueChange={v =>
                  void runUpdate(row.original._key, 'status', { status: v })
                }
                disabled={isSaving || !canManage || isCascadedItem(row.original)}
              >
                <SelectTrigger
                  className='h-9 w-[130px] text-xs'
                  onClick={e => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='text-xs'>
                  {ACTIVITY_STATUSES.map(s => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className='text-xs'
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving ? <CellSavingSpinner label='Saving status' /> : null}
            </div>
          )
        },
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
      {
        id: 'dueWindow',
        accessorFn: row => activityDueWindows(row.targetDate),
        getUniqueValues: row => activityDueWindows(row.targetDate),
        filterFn: (row, id, value: string[]) => {
          const windows = row.getValue<string[]>(id)
          return value.some(window => windows.includes(window))
        },
        enableSorting: false,
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              cell: ({ row }: { row: { original: MeasurableActivityRow } }) =>
                isCascadedItem(row.original) ? null : (
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
      unassignedLabel,
      assigneeOptions,
      canManage,
      isSaving,
      isPending,
      runAssigneesUpdate,
      runUpdate,
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
      columnVisibility: { dueWindow: false },
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
            {table.getColumn('dueWindow') && (
              <DataTableFacetedFilter
                column={table.getColumn('dueWindow')}
                title='Filter by Due date'
                options={ACTIVITY_DUE_WINDOWS.map(w => ({
                  label: w.label,
                  value: w.value,
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
                    colSpan={table.getVisibleFlatColumns().length}
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
