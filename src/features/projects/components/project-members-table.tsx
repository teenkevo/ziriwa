'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import type { ProjectMemberRosterRow } from '@/sanity/lib/projects/get-project-members-roster'
import { PROJECT_ROLE_LABELS } from '@/lib/project-role'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface ProjectMembersTableProps {
  projectId: string
  rows: ProjectMemberRosterRow[]
  onEdit: (row: ProjectMemberRosterRow) => void
  onRefresh: () => void
}

function memberDisplayName(row: ProjectMemberRosterRow): string {
  return row.fullName?.trim() || row.email?.trim() || 'Unknown'
}

function memberInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function memberWorkstreamLabel(row: ProjectMemberRosterRow): string {
  if (
    row.projectRole === 'project_manager' ||
    row.projectRole === 'deputy_project_manager'
  ) {
    return 'All'
  }
  return row.workstreamName?.trim() || '—'
}

export function ProjectMembersTable({
  projectId,
  rows,
  onEdit,
  onRefresh,
}: ProjectMembersTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [deactivating, setDeactivating] =
    React.useState<ProjectMemberRosterRow | null>(null)
  const [reactivating, setReactivating] =
    React.useState<ProjectMemberRosterRow | null>(null)
  const [deleting, setDeleting] = React.useState<ProjectMemberRosterRow | null>(
    null,
  )
  const [statusLoading, setStatusLoading] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  const handleDeactivate = async () => {
    if (!deactivating) return
    setStatusLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${deactivating.memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'inactive' }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to deactivate member',
        )
      }
      toast.success('Member deactivated')
      setDeactivating(null)
      onRefresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to deactivate member',
      )
    } finally {
      setStatusLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${deleting.memberId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to delete member',
        )
      }
      toast.success('Member removed from project')
      setDeleting(null)
      onRefresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete member',
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!reactivating) return
    setStatusLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${reactivating.memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to reactivate member',
        )
      }
      toast.success('Member reactivated')
      setReactivating(null)
      onRefresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reactivate member',
      )
    } finally {
      setStatusLoading(false)
    }
  }

  const columns = React.useMemo<ColumnDef<ProjectMemberRosterRow>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        accessorFn: row => memberDisplayName(row),
        cell: ({ row }) => {
          const r = row.original
          const displayName = memberDisplayName(r)
          const initials = memberInitials(displayName)
          return (
            <div className='flex items-center gap-3'>
              <Avatar className='h-8 w-8'>
                <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>{displayName}</p>
                {r.email ? (
                  <p className='truncate text-xs text-muted-foreground'>
                    {r.email}
                  </p>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        id: 'role',
        header: 'Project role',
        cell: ({ row }) => (
          <span className='text-sm'>
            {PROJECT_ROLE_LABELS[row.original.projectRole]}
          </span>
        ),
      },
      {
        id: 'workstream',
        header: 'Workstream',
        cell: ({ row }) => (
          <span className='text-sm text-muted-foreground'>
            {memberWorkstreamLabel(row.original)}
          </span>
        ),
      },
      {
        id: 'onboarded',
        header: 'Date onboarded',
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
            variant={
              row.original.status === 'active' ? 'secondary' : 'outline'
            }
          >
            {row.original.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right font-medium'>Actions</div>,
        cell: ({ row }) => {
          const r = row.original
          const isActive = r.status === 'active'
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
                    <span className='sr-only'>Actions for {memberDisplayName(r)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-44'>
                  <DropdownMenuItem onClick={() => onEdit(r)}>
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isActive ? (
                    <DropdownMenuItem
                      className='text-destructive focus:text-destructive'
                      onClick={() => setDeactivating(r)}
                    >
                      <UserMinus className='mr-2 h-4 w-4' />
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setReactivating(r)}>
                      <UserPlus className='mr-2 h-4 w-4' />
                      Reactivate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className='text-destructive focus:text-destructive'
                    onClick={() => setDeleting(r)}
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [onEdit],
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
    <>
      <div className='space-y-4'>
        <Input
          placeholder='Search project members…'
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
                    No project members yet.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.original.memberId}>
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
        {table.getPageCount() > 1 ? (
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
        ) : null}
      </div>

      <AlertDialog
        open={!!deactivating}
        onOpenChange={open => !open && !statusLoading && setDeactivating(null)}
      >
        <AlertDialogContent disableClose={statusLoading}>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivating ? (
                <>
                  <strong>{memberDisplayName(deactivating)}</strong> will lose
                  access to this project until reactivated. Their project role
                  assignment will be preserved.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void handleDeactivate()
              }}
              disabled={statusLoading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {statusLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deactivating…
                </>
              ) : (
                'Deactivate member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={open => !open && !deleteLoading && setDeleting(null)}
      >
        <AlertDialogContent disableClose={deleteLoading}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? (
                <>
                  This will{' '}
                  <strong className='text-destructive'>
                    permanently remove
                  </strong>{' '}
                  <strong>{memberDisplayName(deleting)}</strong> from this
                  project. Their staff record will not be deleted. This cannot
                  be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleteLoading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting…
                </>
              ) : (
                'Delete member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!reactivating}
        onOpenChange={open => !open && !statusLoading && setReactivating(null)}
      >
        <AlertDialogContent disableClose={statusLoading}>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate member?</AlertDialogTitle>
            <AlertDialogDescription>
              {reactivating ? (
                <>
                  Restore <strong>{memberDisplayName(reactivating)}</strong> as
                  an active project member with their current role.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void handleReactivate()
              }}
              disabled={statusLoading}
            >
              {statusLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Reactivating…
                </>
              ) : (
                'Reactivate member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
