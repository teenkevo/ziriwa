'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Loader2, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { hasRoleAtLeast } from '@/lib/app-role'
import { useAppRole } from '@/hooks/use-app-role'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditDepartmentDialog } from '@/features/dashboard/components/edit-department-dialog'
import { CreateDivisionDialog } from '@/features/dashboard/components/create-division-dialog'
import { EditDivisionDialog } from '@/features/dashboard/components/edit-division-dialog'
import {
  DivisionsTable,
  type DivisionRow,
} from '@/features/dashboard/components/divisions-table'
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
import { PhoenixRouteLoading } from '@/components/phoenix-route-loading'

export type DepartmentDivisionsDivision = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  sectionCount?: number
  department?: { _id: string }
  assistantCommissioner?: { _id: string; fullName?: string }
  staffCount?: number
  initiativeProgressPercent: number
  initiativeProgressCompleted: number
  initiativeProgressTotal: number
  sectionNames?: string[]
}

type Department = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  commissioner?: { _id: string }
}

type ACStaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

type CommissionerMember = {
  _id: string
  fullName: string
  staffId?: string
}

function filterDivisionsForGrid(
  divisions: DepartmentDivisionsDivision[],
  query: string,
): DepartmentDivisionsDivision[] {
  const q = query.toLowerCase().trim()
  if (!q) return divisions
  return divisions.filter(d => {
    const hay = [
      d.fullName,
      d.name,
      d.acronym,
      d.assistantCommissioner?.fullName,
      ...(d.sectionNames ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function DepartmentDivisionsView({
  department,
  divisions,
  assistantCommissioners = [],
  assistantCommissionersDepartment = [],
  commissionersForDepartmentEdit = [],
  /** When set, navigate here after deleting the department (e.g. `/departments` from the department URL). */
  deleteDepartmentRedirectTo,
}: {
  department: Department
  divisions: DepartmentDivisionsDivision[]
  assistantCommissioners?: ACStaffMember[]
  assistantCommissionersDepartment?: ACStaffMember[]
  commissionersForDepartmentEdit?: CommissionerMember[]
  deleteDepartmentRedirectTo?: string | null
}) {
  const router = useRouter()
  const [showCreateDivision, setShowCreateDivision] = useState(false)
  const [showEditDepartment, setShowEditDepartment] = useState(false)
  const [showDeleteDepartment, setShowDeleteDepartment] = useState(false)
  const [deletingDepartment, setDeletingDepartment] = useState(false)
  const [editingDivision, setEditingDivision] =
    useState<DepartmentDivisionsDivision | null>(null)
  const [deletingDivision, setDeletingDivision] =
    useState<DepartmentDivisionsDivision | null>(null)
  const [deletingDivisionLoading, setDeletingDivisionLoading] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [gridSearch, setGridSearch] = useState('')
  const { mode: viewMode, setMode: setViewMode } = useViewMode(
    'dashboard-divisions-view',
  )
  const { role, isLoaded } = useAppRole()

  const canCreateDeptOrDivision =
    isLoaded && hasRoleAtLeast(role, 'commissioner')
  const canCreateDivision = canCreateDeptOrDivision
  const allowDepartmentActions = canCreateDeptOrDivision
  const departmentName = department?.name ?? 'the current department'

  const divisionLabel = (d: DepartmentDivisionsDivision) => d.fullName || d.name

  const handleDeleteDivision = async () => {
    if (!deletingDivision) return
    setDeletingDivisionLoading(true)
    try {
      const res = await fetch(`/api/divisions/${deletingDivision._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete division')
      }
      setDeletingDivision(null)
      await router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete division')
    } finally {
      setDeletingDivisionLoading(false)
    }
  }

  const onEditDivisionRow = React.useCallback((row: DivisionRow) => {
    setEditingDivision(row as DepartmentDivisionsDivision)
  }, [])

  const onDeleteDivisionRow = React.useCallback((row: DivisionRow) => {
    setDeletingDivision(row as DepartmentDivisionsDivision)
  }, [])

  const handleDeleteDepartment = async () => {
    if (!department) return
    setDeletingDepartment(true)
    try {
      const res = await fetch(`/api/departments/${department._id}`, {
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
      setShowDeleteDepartment(false)
      if (deleteDepartmentRedirectTo) {
        router.push(deleteDepartmentRedirectTo)
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete department')
    } finally {
      setDeletingDepartment(false)
    }
  }

  const filteredDivisionsForGrid = React.useMemo(
    () => filterDivisionsForGrid(divisions, gridSearch),
    [divisions, gridSearch],
  )

  const handleBulkDeleteDivisions = async () => {
    if (!bulkDeleteIds?.length) return
    setBulkDeleting(true)
    try {
      for (const id of bulkDeleteIds) {
        const res = await fetch(`/api/divisions/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Failed to delete division ${id}`)
        }
      }
      setBulkDeleteIds(null)
      await router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete divisions')
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className='flex-col md:flex'>
      <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {department.fullName || department.name}
            </h1>
            <p className='text-sm text-muted-foreground'>Divisions</p>
          </div>
          <div className='flex w-full flex-wrap items-center gap-2 justify-between sm:w-auto sm:justify-end shrink-0'>
            <div className='flex flex-wrap items-center gap-2'>
              {isLoaded ? (
                <>
                  {canCreateDivision && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setShowCreateDivision(true)}
                    >
                      <Plus className='h-4 w-4 mr-1 text-primary' />
                      Add a division
                    </Button>
                  )}
                  {allowDepartmentActions && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size='sm' className='shrink-0'>
                          Actions
                          <ChevronDown className='h-4 w-4 ml-1 opacity-70' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={() => setShowEditDepartment(true)}
                        >
                          <Pencil className='h-4 w-4 mr-2' />
                          Edit department
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='text-destructive focus:text-destructive'
                          onClick={() => setShowDeleteDepartment(true)}
                        >
                          <Trash2 className='h-4 w-4 mr-2' />
                          Delete department
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              ) : null}
            </div>
            {isLoaded && (
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            )}
          </div>
        </div>

        {!isLoaded ? (
          <PhoenixRouteLoading />
        ) : viewMode === 'table' ? (
          <DivisionsTable
            data={divisions}
            canManageDivisions={canCreateDeptOrDivision}
            onEditDivision={onEditDivisionRow}
            onDeleteDivision={onDeleteDivisionRow}
            onBulkDeleteDivisions={
              canCreateDeptOrDivision ? ids => setBulkDeleteIds(ids) : undefined
            }
          />
        ) : (
          <>
            {filteredDivisionsForGrid.length === 0 &&
              divisions.length > 0 &&
              gridSearch.trim() && (
                <p className='text-sm text-muted-foreground'>
                  No divisions match your search.
                </p>
              )}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {filteredDivisionsForGrid.map(div => (
                <Card
                  key={div._id}
                  className='md:hover:shadow-lg md:hover:border-primary bg-primary/5 md:hover:bg-primary/10 shadow-md transition-all'
                >
                  <Link
                    href={`/divisions/${div.slug?.current ?? div._id}`}
                    prefetch={false}
                  >
                    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                      <CardTitle className='text-xs font-medium text-muted-foreground'>
                        Division
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='text-lg font-bold'>
                        {div.fullName || div.name}
                      </div>
                      <div className='mt-1 flex items-start justify-between gap-2 text-xs text-muted-foreground'>
                        <span className='min-w-0 truncate'>
                          Assistant Commissioner -{' '}
                          {div.assistantCommissioner?.fullName?.trim() || '—'}
                        </span>
                        <span className='shrink-0 tabular-nums'>
                          {div.sectionCount === 1
                            ? '1 section'
                            : `${div.sectionCount ?? 0} sections`}
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
              {canCreateDivision && (
                <Card
                  className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
                  onClick={() => setShowCreateDivision(true)}
                >
                  <CardContent className='flex flex-col items-center justify-center pt-6'>
                    <Plus className='h-10 w-10 text-primary mb-2' />
                    <p className='text-sm font-medium'>Create Division</p>
                    <p className='text-xs text-muted-foreground'>
                      Add a division to {departmentName}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {allowDepartmentActions && department && (
          <EditDepartmentDialog
            open={showEditDepartment}
            onOpenChange={setShowEditDepartment}
            department={department}
            commissioners={commissionersForDepartmentEdit}
          />
        )}
        <AlertDialog
          open={showDeleteDepartment}
          onOpenChange={setShowDeleteDepartment}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete department?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                &quot;
                {department ? department.fullName || department.name : ''}
                &quot; and all of its divisions. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingDepartment}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleDeleteDepartment()
                }}
                disabled={deletingDepartment}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {deletingDepartment ? (
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
        {canCreateDivision && (
          <CreateDivisionDialog
            open={showCreateDivision}
            onOpenChange={setShowCreateDivision}
            departmentId={department._id}
            departmentName={departmentName}
            assistantCommissioners={assistantCommissioners}
          />
        )}
        {canCreateDeptOrDivision && editingDivision && (
          <EditDivisionDialog
            open={!!editingDivision}
            onOpenChange={open => !open && setEditingDivision(null)}
            division={{
              _id: editingDivision._id,
              name: editingDivision.name,
              fullName: editingDivision.fullName,
              acronym: editingDivision.acronym,
              isDefault: editingDivision.isDefault,
              department: editingDivision.department,
              assistantCommissioner: editingDivision.assistantCommissioner?._id
                ? { _id: editingDivision.assistantCommissioner._id }
                : undefined,
            }}
            assistantCommissioners={assistantCommissionersDepartment}
          />
        )}
        <AlertDialog
          open={bulkDeleteIds !== null}
          onOpenChange={open => !open && setBulkDeleteIds(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected divisions?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                {bulkDeleteIds?.length ?? 0} division
                {bulkDeleteIds?.length === 1 ? '' : 's'} and all related
                sections, contracts, weekly sprints, stakeholder engagement
                data, and uploaded files. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleBulkDeleteDivisions()
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
                  'Delete divisions'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!deletingDivision}
          onOpenChange={open => !open && setDeletingDivision(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete division?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                &quot;
                {deletingDivision ? divisionLabel(deletingDivision) : ''}
                &quot; and all of its sections. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingDivisionLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleDeleteDivision()
                }}
                disabled={deletingDivisionLoading}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {deletingDivisionLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting…
                  </>
                ) : (
                  'Delete division'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
