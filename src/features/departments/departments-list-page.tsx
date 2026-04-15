'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Plus } from 'lucide-react'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import {
  DepartmentsTable,
  type DepartmentRow,
} from '@/features/departments/departments-table'
import { CreateDepartmentDialog } from '@/features/dashboard/components/create-department-dialog'
import { EditDepartmentDialog } from '@/features/dashboard/components/edit-department-dialog'
import { hasRoleAtLeast } from '@/lib/app-role'
import { useAppRole } from '@/hooks/use-app-role'
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
import type { DepartmentListRow } from '@/sanity/lib/departments/get-all-departments-for-list'

type CommissionerMember = {
  _id: string
  fullName: string
  staffId?: string
}

function filterDepartmentsForGrid(
  departments: DepartmentListRow[],
  query: string,
): DepartmentListRow[] {
  const q = query.toLowerCase().trim()
  if (!q) return departments
  return departments.filter(d => {
    const hay = [
      d.fullName,
      d.name,
      d.acronym,
      d.commissioner?.fullName,
      ...(d.divisionNames ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

function DepartmentsCreateCard({
  onClick,
  variant = 'default',
}: {
  onClick: () => void
  variant?: 'first' | 'default'
}) {
  const description =
    variant === 'first'
      ? 'Add your first department to start adding divisions'
      : 'Add a department to organize divisions'
  return (
    <Card
      className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
      onClick={onClick}
    >
      <CardContent className='flex flex-col items-center justify-center pt-6'>
        <Plus className='h-10 w-10 text-primary mb-2' />
        <p className='text-sm font-medium'>Create department</p>
        <p className='text-xs text-muted-foreground text-center px-2'>
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

export function DepartmentsListPage({
  departments,
  commissioners,
}: {
  departments: DepartmentListRow[]
  commissioners: CommissionerMember[]
}) {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const { mode: viewMode, setMode: setViewMode } = useViewMode(
    'departments-list-view',
  )
  const { role, isLoaded } = useAppRole()
  const canManageDepartments = isLoaded && hasRoleAtLeast(role, 'commissioner')

  const [editingDepartment, setEditingDepartment] =
    React.useState<DepartmentRow | null>(null)
  const [deletingDepartment, setDeletingDepartment] =
    React.useState<DepartmentRow | null>(null)
  const [deletingLoading, setDeletingLoading] = React.useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = React.useState<string[] | null>(
    null,
  )
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [showCreateDepartment, setShowCreateDepartment] = React.useState(false)

  const filteredForGrid = React.useMemo(
    () => filterDepartmentsForGrid(departments, search),
    [departments, search],
  )

  const breadcrumbItems = React.useMemo(() => [{ label: 'Departments' }], [])

  useRegisterPageBreadcrumbs(breadcrumbItems)

  const emptyTableLabel =
    departments.length === 0
      ? 'No departments yet.'
      : 'No departments match your search.'

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return
    setDeletingLoading(true)
    try {
      const res = await fetch(`/api/departments/${deletingDepartment._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete department')
      }
      await fetch('/api/department/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      })
      setDeletingDepartment(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete department')
    } finally {
      setDeletingLoading(false)
    }
  }

  const handleBulkDeleteDepartments = async (ids: string[]) => {
    if (!ids.length) return
    setBulkDeleting(true)
    try {
      for (const id of ids) {
        const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Failed to delete department ${id}`)
        }
      }
      await fetch('/api/department/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      })
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete departments')
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className='flex-col md:flex'>
      <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Departments</h1>
            <p className='text-sm text-muted-foreground'>
              Choose a department to view its divisions
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 justify-end shrink-0'>
            {canManageDepartments && (
              <Button size='sm' onClick={() => setShowCreateDepartment(true)}>
                <Plus className='h-4 w-4 mr-1' />
                Create department
              </Button>
            )}
            {departments.length > 0 && (
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            )}
          </div>
        </div>

        {departments.length === 0 ? (
          canManageDepartments ? (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              <DepartmentsCreateCard
                variant='first'
                onClick={() => setShowCreateDepartment(true)}
              />
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No departments yet.</p>
          )
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <Input
                  placeholder='Search by department, acronym, commissioner, or division…'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className='max-w-md'
                  aria-label='Search departments'
                />
                {search.trim() ? (
                  <p className='text-sm text-muted-foreground sm:text-right'>
                    {filteredForGrid.length} of {departments.length} department
                    {departments.length === 1 ? '' : 's'} (filtered)
                  </p>
                ) : null}
              </div>
            )}

            {viewMode === 'table' ? (
              <DepartmentsTable
                data={departments}
                emptyLabel={emptyTableLabel}
                canManageDepartments={canManageDepartments}
                onEditDepartment={d => setEditingDepartment(d)}
                onDeleteDepartment={d => setDeletingDepartment(d)}
                onBulkDeleteDepartments={
                  canManageDepartments
                    ? ids => setBulkDeleteIds(ids)
                    : undefined
                }
              />
            ) : filteredForGrid.length === 0 ? (
              <div className='space-y-4'>
                <p className='text-sm text-muted-foreground'>
                  {emptyTableLabel}
                </p>
                {canManageDepartments && (
                  <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    <DepartmentsCreateCard
                      onClick={() => setShowCreateDepartment(true)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {filteredForGrid.map(dept => {
                  const href = `/departments/${dept.slug?.current ?? dept._id}`
                  const title = dept.fullName || dept.name
                  const divisionCount = dept.divisionNames?.length ?? 0
                  return (
                    <Card
                      key={dept._id}
                      className='md:hover:shadow-lg md:hover:border-primary bg-primary/5 md:hover:bg-primary/10 shadow-md transition-all'
                    >
                      <Link href={href} prefetch={false}>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                          <CardTitle className='text-xs font-medium text-muted-foreground'>
                            Department
                            {dept.isDefault && (
                              <span className='ml-2 text-[10px] font-normal text-primary'>
                                Default
                              </span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className='text-lg font-bold'>{title}</div>
                          <div className='mt-1 flex items-start justify-between gap-2 text-xs text-muted-foreground'>
                            <span className='min-w-0 truncate'>
                              Commissioner -{' '}
                              {dept.commissioner?.fullName?.trim() || '—'}
                            </span>
                            <span className='shrink-0 tabular-nums'>
                              {divisionCount === 1
                                ? '1 division'
                                : `${divisionCount} divisions`}
                            </span>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  )
                })}
                {canManageDepartments && (
                  <DepartmentsCreateCard
                    onClick={() => setShowCreateDepartment(true)}
                  />
                )}
              </div>
            )}
          </>
        )}

        {canManageDepartments && (
          <CreateDepartmentDialog
            open={showCreateDepartment}
            onOpenChange={setShowCreateDepartment}
            commissioners={commissioners}
          />
        )}

        {canManageDepartments && editingDepartment && (
          <EditDepartmentDialog
            open={!!editingDepartment}
            onOpenChange={open => !open && setEditingDepartment(null)}
            department={{
              _id: editingDepartment._id,
              name: editingDepartment.name,
              fullName: editingDepartment.fullName,
              acronym: editingDepartment.acronym,
              commissioner: editingDepartment.commissioner,
            }}
            commissioners={commissioners}
          />
        )}

        <AlertDialog
          open={!!deletingDepartment}
          onOpenChange={open => !open && setDeletingDepartment(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete department?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                &quot;
                {deletingDepartment
                  ? deletingDepartment.fullName || deletingDepartment.name
                  : ''}
                &quot; and everything under it. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleDeleteDepartment()
                }}
                disabled={deletingLoading}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {deletingLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting…
                  </>
                ) : (
                  'Delete department'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={bulkDeleteIds !== null}
          onOpenChange={open => !open && setBulkDeleteIds(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected departments?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                {bulkDeleteIds?.length ?? 0} department
                {bulkDeleteIds?.length === 1 ? '' : 's'} and everything under
                them. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  const ids = bulkDeleteIds
                  if (!ids?.length) return
                  setBulkDeleteIds(null)
                  void handleBulkDeleteDepartments(ids)
                }}
                disabled={bulkDeleting}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting…
                  </>
                ) : (
                  'Delete departments'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
