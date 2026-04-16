'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Plus, ChevronDown, Pencil, Trash2, Loader2 } from 'lucide-react'
import { canCreateSection, hasRoleAtLeast } from '@/lib/app-role'
import { useAppRole } from '@/hooks/use-app-role'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import { CreateSectionDialog } from '@/features/dashboard/components/create-section-dialog'
import { EditDivisionDialog } from '@/features/dashboard/components/edit-division-dialog'
import { EditSectionDialog } from '@/features/dashboard/components/edit-section-dialog'
import { DivisionSectionsTable } from '@/features/divisions/division-sections-table'
import type { Section } from '@/sanity/lib/sections/get-sections-by-division'
import type { SectionRow } from '@/features/divisions/division-sections-table'

type SectionWithMetrics = Section & {
  initiativeProgressPercent: number
  initiativeProgressCompleted: number
  initiativeProgressTotal: number
}

type Division = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  slug?: { current: string }
  isDefault?: boolean
  department?: {
    _id: string
    fullName?: string
    acronym?: string
    slug?: { current: string }
  }
  assistantCommissioner?: { _id: string }
}

type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

function filterSectionsForGrid(
  list: SectionWithMetrics[],
  query: string,
): SectionWithMetrics[] {
  const q = query.toLowerCase().trim()
  if (!q) return list
  return list.filter(s => {
    const hay = [s.name, s.manager?.fullName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function DivisionPageContent({
  division,
  sections,
  managers,
  assistantCommissioners,
}: {
  division: Division
  sections: SectionWithMetrics[]
  managers: StaffMember[]
  assistantCommissioners: StaffMember[]
}) {
  const router = useRouter()
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [showEditDivision, setShowEditDivision] = useState(false)
  const [showDeleteDivision, setShowDeleteDivision] = useState(false)
  const [deletingDivision, setDeletingDivision] = useState(false)
  const [editingSection, setEditingSection] =
    useState<SectionWithMetrics | null>(null)
  const [deletingSection, setDeletingSection] =
    useState<SectionWithMetrics | null>(null)
  const [deletingSectionLoading, setDeletingSectionLoading] = useState(false)
  const [bulkDeleteSectionIds, setBulkDeleteSectionIds] = useState<
    string[] | null
  >(null)
  const [bulkDeletingSections, setBulkDeletingSections] = useState(false)
  const [gridSearch, setGridSearch] = useState('')

  const { mode: viewMode, setMode: setViewMode } = useViewMode(
    'division-sections-view',
  )

  const { role, isLoaded } = useAppRole()
  const allowSectionActions = isLoaded && canCreateSection(role)
  const allowDivisionActions = isLoaded && hasRoleAtLeast(role, 'commissioner')

  const divisionLabel = division.fullName || division.name
  const departmentLabel = division.department?.fullName || null

  const breadcrumbItems = React.useMemo(() => {
    const items: { label: string; href?: string }[] = []
    if (departmentLabel) {
      const deptSlug = division.department?.slug?.current
      const href = deptSlug ? `/departments/${deptSlug}` : '/departments'
      items.push({ label: departmentLabel, href })
    }
    items.push({ label: divisionLabel })
    return items
  }, [departmentLabel, divisionLabel])

  useRegisterPageBreadcrumbs(breadcrumbItems)

  const openEditSection = React.useCallback((s: SectionRow) => {
    setEditingSection(s as SectionWithMetrics)
  }, [])

  const openDeleteSection = React.useCallback((s: SectionRow) => {
    setDeletingSection(s as SectionWithMetrics)
  }, [])

  const filteredSectionsForGrid = React.useMemo(
    () => filterSectionsForGrid(sections, gridSearch),
    [sections, gridSearch],
  )

  const handleDeleteDivision = async () => {
    setDeletingDivision(true)
    try {
      const res = await fetch(`/api/divisions/${division._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete division')
      }
      setShowDeleteDivision(false)
      router.push('/departments')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete division')
    } finally {
      setDeletingDivision(false)
    }
  }

  const handleDeleteSection = async () => {
    if (!deletingSection) return
    setDeletingSectionLoading(true)
    try {
      const res = await fetch(`/api/sections/${deletingSection._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete section')
      }
      setDeletingSection(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete section')
    } finally {
      setDeletingSectionLoading(false)
    }
  }

  const handleBulkDeleteSections = async () => {
    if (!bulkDeleteSectionIds?.length) return
    setBulkDeletingSections(true)
    try {
      for (const id of bulkDeleteSectionIds) {
        const res = await fetch(`/api/sections/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Failed to delete section ${id}`)
        }
      }
      setBulkDeleteSectionIds(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete sections')
    } finally {
      setBulkDeletingSections(false)
    }
  }

  return (
    <div className='flex-col md:flex'>
      <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {divisionLabel}
            </h1>
            <p className='text-sm text-muted-foreground'>Sections</p>
          </div>
          <div className='flex w-full flex-wrap items-center gap-2 justify-between sm:w-auto sm:justify-end shrink-0'>
            <div className='flex flex-wrap items-center gap-2'>
              {allowSectionActions && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowCreateSection(true)}
                >
                  <Plus className='h-4 w-4 mr-1 text-primary' />
                  Add a section
                </Button>
              )}
              {allowDivisionActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size='sm' className='shrink-0'>
                      Actions
                      <ChevronDown className='h-4 w-4 ml-1 opacity-70' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => setShowEditDivision(true)}>
                      <Pencil className='h-4 w-4 mr-2' />
                      Edit division
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='text-destructive focus:text-destructive'
                      onClick={() => setShowDeleteDivision(true)}
                    >
                      <Trash2 className='h-4 w-4 mr-2' />
                      Delete division
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {viewMode === 'table' ? (
          <DivisionSectionsTable
            data={sections}
            allowSectionActions={allowSectionActions}
            onEditSection={openEditSection}
            onDeleteSection={openDeleteSection}
            onBulkDeleteSections={
              allowSectionActions
                ? ids => setBulkDeleteSectionIds(ids)
                : undefined
            }
          />
        ) : (
          <>
            {filteredSectionsForGrid.length === 0 &&
              sections.length > 0 &&
              gridSearch.trim() && (
                <p className='text-sm text-muted-foreground'>
                  No sections match your search.
                </p>
              )}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {filteredSectionsForGrid.map(section => (
                <Card
                  key={section._id}
                  className='md:hover:shadow-lg md:hover:border-primary bg-primary/5 md:hover:bg-primary/10 shadow-md transition-all overflow-hidden'
                >
                  <Link
                    href={`/sections/${section.slug?.current ?? section._id}`}
                    prefetch={false}
                  >
                    <CardHeader className='space-y-0 pb-2'>
                      <CardTitle className='text-xs font-medium text-muted-foreground'>
                        Section
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='font-bold text-lg'>{section.name}</div>
                      {section.manager && (
                        <p className='mt-1 text-xs text-muted-foreground'>
                          Managed by {section.manager.fullName}
                        </p>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
              {allowSectionActions && (
                <Card
                  className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
                  onClick={() => setShowCreateSection(true)}
                >
                  <CardContent className='flex flex-col items-center justify-center pt-6'>
                    <Plus className='h-10 w-10 text-primary mb-2' />
                    <p className='text-sm font-medium'>Create Section</p>
                    <p className='text-xs text-muted-foreground'>
                      Add a section to {division.name}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {allowSectionActions && (
          <CreateSectionDialog
            open={showCreateSection}
            onOpenChange={setShowCreateSection}
            divisionId={division._id}
            departmentId={division.department?._id ?? ''}
            divisionName={division.name}
            managers={managers}
          />
        )}

        {allowDivisionActions && (
          <EditDivisionDialog
            open={showEditDivision}
            onOpenChange={setShowEditDivision}
            division={division}
            assistantCommissioners={assistantCommissioners}
          />
        )}

        {allowSectionActions && editingSection && (
          <EditSectionDialog
            open={!!editingSection}
            onOpenChange={open => !open && setEditingSection(null)}
            section={editingSection}
            divisionId={division._id}
            managers={managers}
          />
        )}

        <AlertDialog
          open={showDeleteDivision}
          onOpenChange={setShowDeleteDivision}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete division?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                &quot;{divisionLabel}&quot; and all of its sections. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingDivision}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleDeleteDivision()
                }}
                disabled={deletingDivision}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {deletingDivision ? (
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

        <AlertDialog
          open={bulkDeleteSectionIds !== null}
          onOpenChange={open => !open && setBulkDeleteSectionIds(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected sections?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                {bulkDeleteSectionIds?.length ?? 0} section
                {bulkDeleteSectionIds?.length === 1 ? '' : 's'} and all related
                performance contracts, weekly sprints, stakeholder engagement
                data, and uploaded files. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDeletingSections}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleBulkDeleteSections()
                }}
                disabled={bulkDeletingSections}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {bulkDeletingSections ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting…
                  </>
                ) : (
                  'Delete sections'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!deletingSection}
          onOpenChange={open => !open && setDeletingSection(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete section?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will{' '}
                <strong className='text-destructive'>permanently delete</strong>{' '}
                &quot;{deletingSection?.name}&quot; and all related performance
                contracts, weekly sprints, stakeholder engagement data, and
                uploaded files. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingSectionLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleDeleteSection()
                }}
                disabled={deletingSectionLoading}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {deletingSectionLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting…
                  </>
                ) : (
                  'Delete section'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
