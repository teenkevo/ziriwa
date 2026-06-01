'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { MoreVertical, Pencil, UserMinus, UserCog } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import type { SectionStaffRosterRow } from '@/sanity/lib/staff/get-section-staff-roster'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { STAFF_ROLE_OPTIONS } from '@/lib/staff-roles'

const ROLE_LABELS = Object.fromEntries(
  STAFF_ROLE_OPTIONS.map(r => [r.value, r.title]),
) as Record<string, string>

export interface SectionStaffTableRow extends SectionStaffRosterRow {
  actingLabel?: string | null
}

interface SectionStaffTableProps {
  rows: SectionStaffTableRow[]
  canManage: boolean
  onEdit: (row: SectionStaffTableRow) => void
  onTransfer: (row: SectionStaffTableRow) => void
  onRefresh: () => void
}

export function SectionStaffTable({
  rows,
  canManage,
  onEdit,
  onTransfer,
  onRefresh,
}: SectionStaffTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [disablingId, setDisablingId] = React.useState<string | null>(null)

  const handleDisable = async (row: SectionStaffTableRow) => {
    if (row.status === 'inactive') return
    if (
      !confirm(
        `Disable ${row.fullName}? They will no longer appear in active staff lists.`,
      )
    ) {
      return
    }
    setDisablingId(row._id)
    try {
      const res = await fetch(`/api/staff/${row._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disable staff')
      }
      toast.success('Staff disabled')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable')
    } finally {
      setDisablingId(null)
    }
  }

  const columns = React.useMemo<ColumnDef<SectionStaffTableRow>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        accessorFn: row => row.fullName,
        cell: ({ row }) => {
          const r = row.original
          const initials = r.fullName
            .split(' ')
            .map(p => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
          return (
            <div className='flex items-center gap-3'>
              <Avatar className='h-8 w-8'>
                <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <p className='text-sm font-medium truncate'>{r.fullName}</p>
                {r.email && (
                  <p className='text-xs text-muted-foreground truncate'>
                    {r.email}
                  </p>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: 'designation',
        header: 'Designation',
        cell: ({ row }) => {
          const r = row.original
          return (
            <div className='flex flex-col gap-1'>
              <span className='text-sm'>
                {ROLE_LABELS[r.role] ?? r.role}
                {r.actingLabel ? ` (${r.actingLabel})` : ''}
              </span>
              {r.staffId && (
                <span className='text-xs text-muted-foreground'>{r.staffId}</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'onboarded',
        header: 'Date onboarded',
        accessorFn: row => row.onboardedAt,
        cell: ({ row }) => (
          <span className='text-sm text-muted-foreground'>
            {row.original.onboardedAt
              ? format(new Date(row.original.onboardedAt), 'dd MMM yyyy')
              : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === 'active' ? 'secondary' : 'outline'}
          >
            {row.original.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Actions</span>,
        cell: ({ row }) => {
          if (!canManage) return null
          const r = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='h-8 w-8'>
                  <MoreVertical className='h-4 w-4' />
                  <span className='sr-only'>Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => onEdit(r)}>
                  <Pencil className='mr-2 h-4 w-4' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTransfer(r)}>
                  <UserCog className='mr-2 h-4 w-4' />
                  Request transfer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  disabled={r.status === 'inactive' || disablingId === r._id}
                  onClick={() => handleDisable(r)}
                >
                  <UserMinus className='mr-2 h-4 w-4' />
                  Disable
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [canManage, disablingId, onEdit, onTransfer],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Search staff…'
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        className='max-w-sm'
      />
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id}>
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
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  No staff found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
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
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
