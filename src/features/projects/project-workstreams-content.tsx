'use client'

import * as React from 'react'
import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'

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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import { useViewMode } from '@/hooks/use-view-mode'
import { CreateWorkstreamDialog } from '@/features/projects/components/create-workstream-dialog'
import { EditWorkstreamDialog } from '@/features/projects/components/edit-workstream-dialog'
import {
  ProjectWorkstreamsTable,
  type ProjectWorkstreamRow,
} from '@/features/projects/components/project-workstreams-table'
import type { StaffPickerMember } from '@/lib/staff-picker'

interface ProjectWorkstreamsContentProps {
  projectId: string
  projectName: string
  canManage: boolean
  viewModeStorageKey?: string
  initialWorkstreams: ProjectWorkstreamRow[]
  initialProjectMembers?: StaffPickerMember[]
}

function filterWorkstreamsForGrid(
  list: ProjectWorkstreamRow[],
  query: string,
): ProjectWorkstreamRow[] {
  const q = query.toLowerCase().trim()
  if (!q) return list
  return list.filter(ws => {
    const hay = [ws.name, ws.workstreamLeadName, ws.workstreamLeadEmail, ...(ws.memberNames ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function ProjectWorkstreamsContent({
  projectId,
  projectName,
  canManage,
  viewModeStorageKey = 'project-workstreams-view',
  initialWorkstreams,
  initialProjectMembers = [],
}: ProjectWorkstreamsContentProps) {
  const [projectMembers, setProjectMembers] = React.useState<
    StaffPickerMember[]
  >(initialProjectMembers)
  const [workstreams, setWorkstreams] =
    React.useState<ProjectWorkstreamRow[]>(initialWorkstreams)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [gridSearch, setGridSearch] = React.useState('')
  const [showCreate, setShowCreate] = React.useState(false)
  const [editing, setEditing] = React.useState<ProjectWorkstreamRow | null>(
    null,
  )
  const [deleting, setDeleting] = React.useState<ProjectWorkstreamRow | null>(
    null,
  )
  const [deletingLoading, setDeletingLoading] = React.useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = React.useState<string[] | null>(
    null,
  )
  const [bulkDeleting, setBulkDeleting] = React.useState(false)

  const { mode: viewMode, setMode: setViewMode } =
    useViewMode(viewModeStorageKey)

  const loadData = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/projects/${projectId}/workstreams`),
      ]
      if (canManage) {
        fetches.push(fetch(`/api/projects/${projectId}/admin-setup`))
      }
      const [wsRes, setupRes] = await Promise.all(fetches)
      const wsData = wsRes.ok
        ? ((await wsRes.json()) as { workstreams?: ProjectWorkstreamRow[] })
        : {}
      setWorkstreams(wsData.workstreams ?? [])
      if (canManage && setupRes?.ok) {
        const setup = (await setupRes.json()) as {
          projectMembers?: StaffPickerMember[]
        }
        setProjectMembers(setup.projectMembers ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setIsRefreshing(false)
    }
  }, [projectId, canManage])

  React.useEffect(() => {
    setWorkstreams(initialWorkstreams)
  }, [initialWorkstreams])

  React.useEffect(() => {
    setProjectMembers(initialProjectMembers)
  }, [initialProjectMembers])

  const filteredForGrid = React.useMemo(
    () => filterWorkstreamsForGrid(workstreams, gridSearch),
    [workstreams, gridSearch],
  )

  async function deleteWorkstreamById(id: string) {
    const res = await fetch(`/api/projects/${projectId}/workstreams/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        typeof data.error === 'string'
          ? data.error
          : 'Failed to delete workstream',
      )
    }
  }

  async function handleDeleteOne() {
    if (!deleting) return
    setDeletingLoading(true)
    try {
      await deleteWorkstreamById(deleting._id)
      setDeleting(null)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workstream')
    } finally {
      setDeletingLoading(false)
    }
  }

  async function handleBulkDelete() {
    if (!bulkDeleteIds?.length) return
    setBulkDeleting(true)
    try {
      for (const id of bulkDeleteIds) {
        await deleteWorkstreamById(id)
      }
      setBulkDeleteIds(null)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workstreams')
    } finally {
      setBulkDeleting(false)
    }
  }

  if (isRefreshing && workstreams.length === 0) {
    return <p className='text-sm text-muted-foreground'>Loading workstreams…</p>
  }

  return (
    <div className='space-y-6'>
      {isRefreshing ? (
        <p className='text-xs text-muted-foreground' aria-live='polite'>
          Refreshing…
        </p>
      ) : null}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex w-full flex-wrap items-center gap-2 justify-between sm:w-auto sm:justify-end shrink-0'>
          <div className='flex flex-wrap items-center gap-2'>
            {canManage ? (
              <Button size='sm' onClick={() => setShowCreate(true)}>
                <Plus className='h-4 w-4 mr-1' />
                Add workstream
              </Button>
            ) : null}
          </div>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {viewMode === 'table' ? (
        <ProjectWorkstreamsTable
          data={workstreams}
          allowActions={canManage}
          onEditWorkstream={setEditing}
          onDeleteWorkstream={setDeleting}
          onBulkDeleteWorkstreams={
            canManage ? ids => setBulkDeleteIds(ids) : undefined
          }
        />
      ) : (
        <>
          {workstreams.length > 0 ? (
            <div className='max-w-sm'>
              <Input
                placeholder='Search workstreams…'
                value={gridSearch}
                onChange={e => setGridSearch(e.target.value)}
              />
            </div>
          ) : null}
          {filteredForGrid.length === 0 &&
            workstreams.length > 0 &&
            gridSearch.trim() && (
              <p className='text-sm text-muted-foreground'>
                No workstreams match your search.
              </p>
            )}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredForGrid.map(ws => (
              <Card
                key={ws._id}
                className='relative overflow-hidden md:hover:shadow-lg md:hover:border-primary bg-primary/5 md:hover:bg-primary/10 shadow-md transition-all'
              >
                {canManage ? (
                  <div className='absolute right-2 top-2 z-10'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-muted-foreground'
                        >
                          <MoreVertical className='h-4 w-4' />
                          <span className='sr-only'>Workstream actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-44'>
                        <DropdownMenuItem onClick={() => setEditing(ws)}>
                          <Pencil className='h-4 w-4 mr-2' />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='text-destructive focus:text-destructive'
                          onClick={() => setDeleting(ws)}
                        >
                          <Trash2 className='h-4 w-4 mr-2' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
                <CardHeader className='space-y-0 pb-2 pr-12'>
                  <CardTitle className='text-xs font-medium text-muted-foreground'>
                    Workstream
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='font-bold text-lg'>{ws.name}</div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {ws.workstreamLeadName?.trim()
                      ? `Lead: ${ws.workstreamLeadName}`
                      : 'No lead assigned'}
                  </p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {(ws.memberNames ?? []).filter(Boolean).length > 0
                      ? `Members: ${(ws.memberNames ?? []).filter(Boolean).join(', ')}`
                      : 'No members'}
                  </p>
                </CardContent>
              </Card>
            ))}
            {canManage ? (
              <Card
                className='cursor-pointer border-2 border-primary border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[120px]'
                onClick={() => setShowCreate(true)}
              >
                <CardContent className='flex flex-col items-center justify-center pt-6'>
                  <Plus className='h-10 w-10 text-primary mb-2' />
                  <p className='text-sm font-medium'>Create workstream</p>
                  <p className='text-xs text-muted-foreground text-center px-4'>
                    Add a workstream to {projectName}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
          {workstreams.length === 0 && !canManage ? (
            <p className='text-sm text-muted-foreground'>No workstreams yet.</p>
          ) : null}
        </>
      )}

      {canManage ? (
        <>
          <CreateWorkstreamDialog
            projectId={projectId}
            projectMembers={projectMembers}
            open={showCreate}
            onOpenChange={setShowCreate}
            onSuccess={() => void loadData()}
            showTrigger={false}
          />
          {editing ? (
            <EditWorkstreamDialog
              open={!!editing}
              onOpenChange={open => !open && setEditing(null)}
              projectId={projectId}
              workstream={editing}
              projectMembers={projectMembers}
              onSuccess={() => void loadData()}
            />
          ) : null}
        </>
      ) : null}

      <AlertDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <AlertDialogContent disableClose={deletingLoading}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workstream?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will{' '}
              <strong className='text-destructive'>permanently delete</strong>{' '}
              &quot;{deleting?.name}&quot; and related contracts, sprints, and
              engagement data. Project members on this workstream will be marked
              inactive. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void handleDeleteOne()
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
                'Delete workstream'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteIds !== null}
        onOpenChange={open => !open && setBulkDeleteIds(null)}
      >
        <AlertDialogContent disableClose={bulkDeleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected workstreams?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will{' '}
              <strong className='text-destructive'>permanently delete</strong>{' '}
              {bulkDeleteIds?.length ?? 0} workstream
              {bulkDeleteIds?.length === 1 ? '' : 's'} and related data. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void handleBulkDelete()
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
                'Delete workstreams'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
