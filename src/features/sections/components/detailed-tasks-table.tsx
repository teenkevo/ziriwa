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
  Lock,
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
import { DataTableColumnHeader } from '@/features/members/components/data-table-column-header'
import { DataTableFacetedFilter } from '@/features/members/components/data-table-faceted-filter'
import { OfficerSwitcher, type Officer } from './officer-switcher'
import { Trash2 } from 'lucide-react'
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

const PRIORITIES = [
  { label: 'Highest', value: 'highest' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Lowest', value: 'lowest' },
]

const TASK_STATUSES = [
  { label: 'To do', value: 'to_do' },
  { label: 'Inputs submitted', value: 'inputs_submitted' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'In review', value: 'in_review' },
  { label: 'Done', value: 'done' },
]

export type DeliverableItem = {
  _key?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
  tag?: 'support' | 'main'
  locked?: boolean
}

export type PeriodDeliverableItem = {
  _key?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
  tag?: 'support' | 'main'
  locked?: boolean
}

export type PeriodDeliverableReviewEntry = {
  _key?: string
  author?: { _id: string; fullName?: string }
  role?: 'officer' | 'supervisor'
  action?: 'submit' | 'reject' | 'approve' | 'respond'
  message?: string
  createdAt?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
}

export type PeriodDeliverable = {
  _key?: string
  periodKey?: string
  status?: 'pending' | 'delivered' | 'in_review' | 'done'
  submittedAt?: string
  deliverable?: PeriodDeliverableItem[]
  deliverableReviewThread?: PeriodDeliverableReviewEntry[]
}

export type InputsReviewEntry = {
  _key?: string
  author?: { _id: string; fullName?: string }
  role?: 'officer' | 'supervisor'
  action?: 'submit' | 'reject' | 'approve' | 'respond'
  message?: string
  createdAt?: string
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
}

export type TaskInputs = {
  file?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
  submittedAt?: string
}

export type DeliverableReviewEntry = InputsReviewEntry

export type TaskRow = {
  _key?: string
  task: string
  priority: string
  assignee: string | null
  inputs?: TaskInputs
  inputsReviewThread?: InputsReviewEntry[]
  deliverableReviewThread?: DeliverableReviewEntry[]
  status: string
  targetDate?: string
  reportingFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'n/a'
  expectedDeliverable?: string
  reportingPeriodStart?: string
  periodDeliverables?: PeriodDeliverable[]
  deliverable?: DeliverableItem[]
}

/** True when inputs or any deliverables (one-off or period) exist. Locks assignee and task config. */
export function hasOfficerContent(task: TaskRow): boolean {
  if (task.inputs?.file?.asset?.url) return true
  if ((task.deliverable ?? []).some(e => e.file?.asset?.url)) return true
  if (
    (task.periodDeliverables ?? []).some(pd =>
      (pd.deliverable ?? []).some(d => d.file?.asset?.url),
    )
  )
    return true
  return false
}

interface DetailedTasksTableProps {
  tasks: TaskRow[]
  officers: Officer[]
  sectionId: string
  selectedTaskKey: string | null
  onSelectTask: (key: string | null) => void
  onUpdateTask: (key: string, updates: Partial<TaskRow>) => void
  onRemoveTask: (key: string) => void
  isSaving: boolean
}

export function DetailedTasksTable({
  tasks,
  officers,
  sectionId,
  selectedTaskKey,
  onSelectTask,
  onUpdateTask,
  onRemoveTask,
  isSaving,
}: DetailedTasksTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [deleteTaskKey, setDeleteTaskKey] = React.useState<string | null>(null)

  const columns = React.useMemo<ColumnDef<TaskRow>[]>(
    () => [
      {
        accessorKey: 'task',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Detailed Task' />
        ),
        cell: ({ row }) => (
          <span className='min-w-[256px] block break-words'>
            {row.original.task || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Priority' />
        ),
        cell: ({ row }) => (
          <Select
            value={row.original.priority}
            onValueChange={v =>
              onUpdateTask(row.original._key ?? '', { priority: v })
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
          const assigneeLocked = hasOfficerContent(row.original)
          return (
            <div onClick={e => e.stopPropagation()}>
              <OfficerSwitcher
                officers={officers}
                value={row.original.assignee}
                onChange={id =>
                  onUpdateTask(row.original._key ?? '', { assignee: id })
                }
                disabled={isSaving || assigneeLocked}
                placeholder='Select officer'
                sectionId={sectionId}
              />
            </div>
          )
        },
        accessorFn: row => {
          const o = officers.find(x => x._id === row.assignee)
          return o?.fullName ?? ''
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => {
          const status = row.original.status ?? ''
          const hasInputs = !!row.original.inputs?.file?.asset?.url
          return (
            <Select
              value={status}
              onValueChange={v =>
                onUpdateTask(row.original._key ?? '', { status: v })
              }
              disabled={isSaving || !row.original.assignee}
            >
              <SelectTrigger
                className='h-9 w-[130px]'
                onClick={e => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map(s => {
                  const disabled =
                    status === 'to_do' && !hasInputs
                      ? s.value !== 'to_do'
                      : status === 'inputs_submitted'
                        ? s.value !== 'inputs_submitted'
                        : status === 'in_progress'
                          ? [
                              'to_do',
                              'inputs_submitted',
                              'delivered',
                              'in_review',
                              'done',
                            ].includes(s.value)
                          : status === 'delivered'
                            ? [
                                'to_do',
                                'inputs_submitted',
                                'in_progress',
                                'in_review',
                                'done',
                              ].includes(s.value)
                            : status === 'in_review'
                              ? [
                                  'to_do',
                                  'inputs_submitted',
                                  'in_progress',
                                  'delivered',
                                  'done',
                                ].includes(s.value)
                              : ['to_do', 'inputs_submitted'].includes(s.value)
                  return (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      disabled={disabled}
                    >
                      <span className='flex w-full items-center justify-between'>
                        <span>{s.label}</span>
                        {disabled && (
                          <Lock className='ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                        )}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 shrink-0'
            onClick={e => {
              e.stopPropagation()
              setDeleteTaskKey(row.original._key ?? '')
            }}
            disabled={isSaving}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [
      officers,
      sectionId,
      onUpdateTask,
      onRemoveTask,
      isSaving,
      selectedTaskKey,
      onSelectTask,
    ],
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  const isFiltered = table.getState().columnFilters.length > 0

  const priorityOptions = PRIORITIES.map(p => ({
    label: p.label,
    value: p.value,
  }))
  const statusOptions = TASK_STATUSES.map(s => ({
    label: s.label,
    value: s.value,
  }))

  return (
    <>
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex flex-1 flex-wrap items-center gap-2'>
            <div className='relative flex-1 sm:max-w-[280px]'>
              <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search by task title...'
                value={
                  (table.getColumn('task')?.getFilterValue() as string) ?? ''
                }
                onChange={e =>
                  table.getColumn('task')?.setFilterValue(e.target.value)
                }
                className='h-9 pl-8'
              />
            </div>
            {table.getColumn('priority') && (
              <DataTableFacetedFilter
                column={table.getColumn('priority')}
                title='Priority'
                options={priorityOptions}
              />
            )}
            {table.getColumn('status') && (
              <DataTableFacetedFilter
                column={table.getColumn('status')}
                title='Status'
                options={statusOptions}
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
                      className={index === 0 ? 'min-w-[320px] pl-4' : undefined}
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
                    key={row.original._key ?? row.id}
                    className='cursor-pointer'
                    data-state={
                      (row.original._key ?? '') === selectedTaskKey
                        ? 'selected'
                        : undefined
                    }
                    onClick={() =>
                      onSelectTask(
                        (row.original._key ?? '') === selectedTaskKey
                          ? null
                          : (row.original._key ?? null),
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
                    No tasks yet. Add one below.
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
      <AlertDialog
        open={deleteTaskKey !== null}
        onOpenChange={open => !open && setDeleteTaskKey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task and all associated files
              (inputs and deliverables). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTaskKey) {
                  onRemoveTask(deleteTaskKey)
                  setDeleteTaskKey(null)
                }
              }}
              disabled={isSaving}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
