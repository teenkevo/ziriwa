'use client'

import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'
import Link from 'next/link'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { responsibilityCenterLabel } from './board-action-labels'
import type { CommissionerBoardActionRow } from './load-commissioner-board-actions'

function buildColumns({
  onDelete,
  basePath,
  readOnly,
}: {
  onDelete?: (row: CommissionerBoardActionRow) => void
  basePath: string
  readOnly: boolean
}): ColumnDef<CommissionerBoardActionRow>[] {
  const cols: ColumnDef<CommissionerBoardActionRow>[] = []

  if (!readOnly) {
    cols.push({
      id: 'select',
      header: ({ table }) => {
        const rows = table.getRowModel().rows
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
            aria-label={`Select ${row.original.title}`}
          />
        </div>
      ),
      enableSorting: false,
      size: 40,
    })
  }

  cols.push(
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link
          href={`${basePath}/${row.original._id}`}
          prefetch={false}
          className='font-medium hover:underline'
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      id: 'responsibilityCenter',
      header: 'Responsibility center',
      cell: ({ row }) => responsibilityCenterLabel(row.original),
    },
    {
      accessorKey: 'dueDate',
      header: 'Due date',
      cell: ({ row }) => row.original.dueDate ?? '—',
    },
  )

  if (!readOnly && onDelete) {
    cols.push({
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const action = row.original
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
              <DropdownMenuContent align='end' className='w-40'>
                <DropdownMenuItem asChild>
                  <Link
                    href={`${basePath}/${action._id}`}
                    className='flex cursor-pointer items-center'
                  >
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => onDelete(action)}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete
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

export function CommissionerBoardActionsTable({
  data,
  emptyLabel = 'No board actions yet.',
  onDelete,
  onBulkDelete,
  basePath = '/commissioner/board-actions',
  readOnly = false,
}: {
  data: CommissionerBoardActionRow[]
  emptyLabel?: string
  onDelete?: (row: CommissionerBoardActionRow) => void
  onBulkDelete?: (ids: string[]) => void
  basePath?: string
  readOnly?: boolean
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const columns = React.useMemo(
    () => buildColumns({ onDelete, basePath, readOnly }),
    [onDelete, basePath, readOnly],
  )

  React.useEffect(() => {
    setRowSelection({})
  }, [data])

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getRowId: row => row._id,
    getCoreRowModel: getCoreRowModel(),
  })

  const selectedIds = table.getSelectedRowModel().rows.map(r => r.original._id)
  const selectedCount = selectedIds.length

  return (
    <div className='space-y-4'>
      {selectedCount > 0 && onBulkDelete && (
        <Button
          variant='destructive'
          size='sm'
          className='shrink-0'
          onClick={() => onBulkDelete(selectedIds)}
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Delete selected board actions ({selectedCount})
        </Button>
      )}

      <div className='overflow-x-auto overflow-hidden rounded-lg border'>
        <Table>
          <TableHeader className='bg-muted'>
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
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
