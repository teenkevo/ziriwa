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
} from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import type { AppRole } from '@/lib/app-role'
import { APP_ROLE_VALUES } from '@/lib/app-role'
import { APP_ROLE_LABELS } from '@/lib/authz/types'
import { inviteMemberAction } from '@/lib/admin/invite-actions'
import {
  isUraEmailEnforced,
  URA_EMAIL_SUFFIX,
} from '@/lib/staff-email-policy'
import {
  assignAppRoleAction,
  assignStaffDepartmentAction,
  revokeInvitationAction,
} from '@/lib/admin/user-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const NO_ROLE_VALUE = '__none__'
const NO_DEPARTMENT_VALUE = '__none__'

export interface DepartmentOption {
  _id: string
  label: string
}

export interface AppMemberRow {
  clerkUserId: string
  email: string
  name?: string
  imageUrl?: string
  appRole: AppRole | null
  staff?: {
    _id: string
    departmentId?: string
    departmentName?: string
  } | null
}

export interface PendingInviteRow {
  id: string
  email: string
  createdAt: number
}

function memberGlobalFilter(
  row: Row<AppMemberRow>,
  _columnId: string,
  filterValue: unknown,
): boolean {
  const q = String(filterValue ?? '')
    .toLowerCase()
    .trim()
  if (!q) return true
  const m = row.original
  const hay = [m.email, m.name, m.staff?.departmentName, m.appRole]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

interface BuildColumnsOptions {
  departments: DepartmentOption[]
  savingKey: string | null
  isPending: boolean
  commissionerGeneralUserId: string | null
  onAssignRole: (clerkUserId: string, appRole: string) => void
  onAssignDepartment: (member: AppMemberRow, departmentId: string) => void
}

function buildColumns({
  departments,
  savingKey,
  isPending,
  commissionerGeneralUserId,
  onAssignRole,
  onAssignDepartment,
}: BuildColumnsOptions): ColumnDef<AppMemberRow>[] {
  return [
    {
      id: 'user',
      header: 'User',
      accessorFn: row => row.email,
      cell: ({ row }) => {
        const m = row.original
        const initials = (m.name ?? m.email)
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(p => p[0]?.toUpperCase())
          .join('')

        return (
          <div className='flex min-w-0 items-center gap-3'>
            <UserAvatar imageUrl={m.imageUrl} fallback={initials} />
            <div className='min-w-0'>
              <div className='truncate text-sm font-medium'>{m.email}</div>
              {m.name ? (
                <div className='truncate text-xs text-muted-foreground'>
                  {m.name}
                </div>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      id: 'appRole',
      header: 'App role',
      accessorKey: 'appRole',
      cell: ({ row }) => {
        const m = row.original
        const key = m.clerkUserId
        const cgTakenByOther =
          commissionerGeneralUserId !== null &&
          commissionerGeneralUserId !== key

        return (
          <div className='flex min-w-[200px] items-center gap-2'>
            <Select
              value={m.appRole ?? NO_ROLE_VALUE}
              onValueChange={nextRole => onAssignRole(key, nextRole)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ROLE_VALUE}>No role</SelectItem>
                {APP_ROLE_VALUES.map(role => (
                  <SelectItem
                    key={role}
                    value={role}
                    disabled={role === 'commissioner_general' && cgTakenByOther}
                  >
                    {APP_ROLE_LABELS[role]}
                    {role === 'commissioner_general' && cgTakenByOther
                      ? ' (assigned)'
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending && savingKey === key ? (
              <Loader2 className='size-3.5 shrink-0 animate-spin' />
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'department',
      header: 'Department',
      accessorFn: row => row.staff?.departmentName ?? '',
      cell: ({ row }) => {
        const m = row.original
        const key = m.clerkUserId

        if (m.appRole === 'commissioner_general') {
          return <span className='text-sm text-muted-foreground'>—</span>
        }

        const deptKey = `${key}:dept`
        const currentDeptId = m.staff?.departmentId

        return (
          <div className='flex min-w-[200px] items-center gap-2'>
            <Select
              value={currentDeptId}
              onValueChange={nextDept => onAssignDepartment(m, nextDept)}
            >
              <SelectTrigger className='w-full text-muted-foreground max-w-[300px]'>
                <SelectValue placeholder='Select department' />
              </SelectTrigger>
              <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                <SelectItem value={NO_DEPARTMENT_VALUE}>
                  No department
                </SelectItem>
                {departments.map(dept => (
                  <SelectItem
                    key={dept._id}
                    value={dept._id}
                    title={dept.label}
                  >
                    <span className='block truncate'>{dept.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPending && savingKey === deptKey ? (
              <Loader2 className='size-3.5 shrink-0 animate-spin' />
            ) : null}
          </div>
        )
      },
    },
  ]
}

function MembersDataTable({
  data,
  departments,
  commissionerGeneralUserId,
  savingKey,
  isPending,
  onAssignRole,
  onAssignDepartment,
}: {
  data: AppMemberRow[]
  departments: DepartmentOption[]
  commissionerGeneralUserId: string | null
  savingKey: string | null
  isPending: boolean
  onAssignRole: (clerkUserId: string, appRole: string) => void
  onAssignDepartment: (member: AppMemberRow, departmentId: string) => void
}) {
  const [globalFilter, setGlobalFilter] = React.useState('')

  const columns = React.useMemo(
    () =>
      buildColumns({
        departments,
        savingKey,
        isPending,
        commissionerGeneralUserId,
        onAssignRole,
        onAssignDepartment,
      }),
    [
      departments,
      savingKey,
      isPending,
      commissionerGeneralUserId,
      onAssignRole,
      onAssignDepartment,
    ],
  )

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: memberGlobalFilter,
    getRowId: row => row.clerkUserId,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    autoResetPageIndex: true,
  })

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Search staff…'
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        className='max-w-sm'
      />

      <div className='overflow-hidden rounded-xl border bg-background'>
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
            {table.getRowModel().rows.length ? (
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
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  {data.length === 0
                    ? 'No staff onboarded yet. Send an invite to get started.'
                    : 'No staff match your search.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 0 && table.getPageCount() > 1 ? (
        <div className='flex items-center justify-between px-1 text-sm text-muted-foreground'>
          <span>
            {table.getFilteredRowModel().rows.length} staff
            {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span>
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function MembersTable({
  members,
  departments,
  pendingInvites,
}: {
  members: AppMemberRow[]
  departments: DepartmentOption[]
  pendingInvites: PendingInviteRow[]
}) {
  const [isPending, startTransition] = React.useTransition()
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')

  const commissionerGeneralUserId = React.useMemo(
    () =>
      members.find(m => m.appRole === 'commissioner_general')?.clerkUserId ??
      null,
    [members],
  )

  const handleAssignRole = React.useCallback(
    (clerkUserId: string, nextRole: string) => {
      setSavingKey(clerkUserId)
      startTransition(async () => {
        try {
          const fd = new FormData()
          fd.set('clerkUserId', clerkUserId)
          fd.set('appRole', nextRole === NO_ROLE_VALUE ? '' : nextRole)
          await assignAppRoleAction(fd)
          toast.success(
            nextRole === NO_ROLE_VALUE ? 'Role removed' : 'Role assigned',
          )
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to assign role',
          )
        } finally {
          setSavingKey(null)
        }
      })
    },
    [],
  )

  const handleAssignDepartment = React.useCallback(
    (member: AppMemberRow, departmentId: string) => {
      const deptKey = `${member.clerkUserId}:dept`
      setSavingKey(deptKey)
      startTransition(async () => {
        try {
          const fd = new FormData()
          fd.set('clerkUserId', member.clerkUserId)
          fd.set('email', member.email)
          if (member.name) fd.set('memberName', member.name)
          if (member.staff?._id) fd.set('staffId', member.staff._id)
          fd.set(
            'departmentId',
            departmentId === NO_DEPARTMENT_VALUE ? '' : departmentId,
          )
          if (member.appRole) fd.set('appRole', member.appRole)
          await assignStaffDepartmentAction(fd)
          toast.success(
            departmentId === NO_DEPARTMENT_VALUE
              ? 'Department removed'
              : 'Department assigned',
          )
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to assign department',
          )
        } finally {
          setSavingKey(null)
        }
      })
    },
    [],
  )

  return (
    <div className='space-y-8'>
      <div className='space-y-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-1'>
            <h2 className='text-base font-semibold tracking-tight'>
              Onboarded Staff
            </h2>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>Invite Staff</Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-lg'>
              <DialogHeader>
                <DialogTitle>Invite Staff</DialogTitle>
                <DialogDescription>
                  Creates a staff record and sends a Clerk invitation.
                  {isUraEmailEnforced()
                    ? ` Only ${URA_EMAIL_SUFFIX} addresses; self-service sign-up is disabled.`
                    : ' Any email is allowed while URA domain enforcement is off.'}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  startTransition(async () => {
                    try {
                      const fd = new FormData()
                      fd.set('emailAddress', inviteEmail)
                      await inviteMemberAction(fd)
                      toast.success('Invitation sent')
                      setInviteEmail('')
                      setInviteOpen(false)
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : 'Failed to invite',
                      )
                    }
                  })
                }}
                className='space-y-4'
              >
                <div className='grid gap-2'>
                  <Label htmlFor='inviteEmail' required>
                    Email
                  </Label>
                  <Input
                    id='inviteEmail'
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder={
                      isUraEmailEnforced()
                        ? `name${URA_EMAIL_SUFFIX}`
                        : 'name@example.com'
                    }
                    type='email'
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type='submit' disabled={isPending}>
                    {isPending ? (
                      <Loader2 className='mr-2 size-4 animate-spin' />
                    ) : null}
                    {isPending ? 'Sending…' : 'Send invite'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <MembersDataTable
          data={members}
          departments={departments}
          commissionerGeneralUserId={commissionerGeneralUserId}
          savingKey={savingKey}
          isPending={isPending}
          onAssignRole={handleAssignRole}
          onAssignDepartment={handleAssignDepartment}
        />
      </div>

      {pendingInvites.length > 0 ? (
        <div className='space-y-3'>
          <div className='space-y-1'>
            <h2 className='text-base font-semibold tracking-tight'>
              Pending invitations
            </h2>
            <p className='text-sm text-muted-foreground'>
              Users who have been invited but have not signed up yet.
            </p>
          </div>
          <div className='divide-y overflow-hidden rounded-xl border bg-background'>
            {pendingInvites.map(inv => (
              <div
                key={inv.id}
                className='flex items-center justify-between gap-3 px-3 py-2'
              >
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium'>
                    {inv.email}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    Sent {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const fd = new FormData()
                        fd.set('invitationId', inv.id)
                        await revokeInvitationAction(fd)
                        toast.success('Invitation revoked')
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : 'Failed to revoke invitation',
                        )
                      }
                    })
                  }}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function UserAvatar({
  imageUrl,
  fallback,
}: {
  imageUrl?: string
  fallback: string
}) {
  return (
    <Avatar className='size-9'>
      {imageUrl ? <AvatarImage src={imageUrl} alt='' /> : null}
      <AvatarFallback className='text-xs'>{fallback}</AvatarFallback>
    </Avatar>
  )
}
