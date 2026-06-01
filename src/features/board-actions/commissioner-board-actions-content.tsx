'use client'

import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import {
  COMMISSIONER_LEVEL_DIVISION,
  divisionIdForApi,
} from './board-action-labels'
import { CommissionerBoardActionsTable } from './commissioner-board-actions-table'
import type {
  CommissionerBoardActionRow,
  CommissionerDivisionOption,
} from './load-commissioner-board-actions'

type CreateFormState = {
  title: string
  description: string
  dueDate: string
  divisionId: string
}

const emptyFormState = (): CreateFormState => ({
  title: '',
  description: '',
  dueDate: '',
  divisionId: '',
})

export function CommissionerBoardActionsContent({
  divisions,
  actions,
}: {
  departmentName: string
  divisions: CommissionerDivisionOption[]
  actions: CommissionerBoardActionRow[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deletingAction, setDeletingAction] =
    React.useState<CommissionerBoardActionRow | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = React.useState<string[] | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false)
  const [form, setForm] = React.useState<CreateFormState>(emptyFormState)

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        { label: 'Commissioner', href: '/commissioner/dashboard' },
        { label: 'Board Actions' },
      ],
      [],
    ),
  )

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.dueDate) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/board-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          dueDate: form.dueDate,
          divisionId: divisionIdForApi(form.divisionId) ?? undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create board action')
      }
      const data = (await res.json()) as { id?: string }
      setForm(emptyFormState())
      setCreateOpen(false)
      if (data.id) {
        router.push(`/commissioner/board-actions/${data.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Failed to create board action',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingAction) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/board-actions/${deletingAction._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete board action')
      }
      setDeletingAction(null)
      router.refresh()
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Failed to delete board action',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmBulkDelete = async () => {
    if (!bulkDeleteIds?.length) return
    setIsBulkDeleting(true)
    try {
      for (const id of bulkDeleteIds) {
        const res = await fetch(`/api/board-actions/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to delete board action')
        }
      }
      setBulkDeleteIds(null)
      router.refresh()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to delete selected board actions',
      )
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold'>Board Actions</h1>
            <p className='text-sm text-muted-foreground'>
              Manage your board actions
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            New board action
          </Button>
        </div>

        <div className='mt-4'>
          <CommissionerBoardActionsTable
            data={actions}
            onDelete={setDeletingAction}
            onBulkDelete={setBulkDeleteIds}
          />
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (!open && !isSubmitting) {
            setCreateOpen(false)
            setForm(emptyFormState())
          }
        }}
      >
        <DialogContent disableClose={isSubmitting}>
          <DialogHeader>
            <DialogTitle>Create board action</DialogTitle>
            <DialogDescription>
              Create a board action and optionally cascade it to a division.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='ba-title' required>
                Title
              </Label>
              <Input
                id='ba-title'
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='ba-description'>Description</Label>
              <Textarea
                id='ba-description'
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='ba-division'>Cascade to Division</Label>
              <Select
                value={form.divisionId || undefined}
                onValueChange={value =>
                  setForm(f => ({ ...f, divisionId: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id='ba-division'>
                  <SelectValue placeholder='Select Division' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={COMMISSIONER_LEVEL_DIVISION}>
                    None — commissioner level
                  </SelectItem>
                  {divisions.map(div => (
                    <SelectItem key={div._id} value={div._id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='ba-due' required>
                Due date
              </Label>
              <Input
                id='ba-due'
                type='date'
                value={form.dueDate}
                onChange={e =>
                  setForm(f => ({ ...f, dueDate: e.target.value }))
                }
                required
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isSubmitting || !form.title.trim() || !form.dueDate}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Creating...
                  </>
                ) : (
                  'Create action'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingAction !== null}
        onOpenChange={open => {
          if (!open && !isDeleting) setDeletingAction(null)
        }}
      >
        <AlertDialogContent disableClose={isDeleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board action?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingAction?.title}
              &rdquo;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={isDeleting}
              onClick={e => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteIds !== null}
        onOpenChange={open => {
          if (!open && !isBulkDeleting) setBulkDeleteIds(null)
        }}
      >
        <AlertDialogContent disableClose={isBulkDeleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected board actions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {bulkDeleteIds?.length ?? 0} board
              action{bulkDeleteIds?.length === 1 ? '' : 's'}. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={isBulkDeleting}
              onClick={e => {
                e.preventDefault()
                void confirmBulkDelete()
              }}
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting...
                </>
              ) : (
                'Delete board actions'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
