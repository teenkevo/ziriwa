'use client'

import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'

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
import { WorkstreamLeadSwitcher } from '@/features/projects/components/workstream-lead-switcher'
import type { StaffPickerMember } from '@/lib/staff-picker'

interface CreateWorkstreamDialogProps {
  projectId: string
  projectMembers?: StaffPickerMember[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  onWorkstreamCreated?: (workstream: { _id: string; name: string }) => void
  showTrigger?: boolean
  /** Name-only flow — no workstream lead picker (e.g. before assigning a lead). */
  nameOnly?: boolean
}

export function CreateWorkstreamDialog({
  projectId,
  projectMembers = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  onWorkstreamCreated,
  showTrigger = true,
  nameOnly = false,
}: CreateWorkstreamDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const [name, setName] = React.useState('')
  const [leadId, setLeadId] = React.useState('')
  const [isBusy, setIsBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setName('')
      setLeadId('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setIsBusy(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/workstreams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          ...(leadId ? { workstreamLeadStaffId: leadId } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to create workstream',
        )
      }
      const data = (await res.json()) as { workstreamId?: string }
      const workstreamId = data.workstreamId ?? ''
      setOpen(false)
      if (workstreamId) {
        onWorkstreamCreated?.({ _id: workstreamId, name: trimmed })
      }
      onSuccess?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button size='sm'>
            <Plus className='h-4 w-4 mr-1' />
            Add workstream
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create workstream</DialogTitle>
            <DialogDescription>
              {nameOnly
                ? 'Add a workstream to this project.'
                : 'Add a workstream and optionally assign a workstream lead.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label required htmlFor='workstream-name'>
                Workstream name
              </Label>
              <Input
                id='workstream-name'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g. Data Management'
                disabled={isBusy}
                required
              />
            </div>
            {!nameOnly ? (
              <div className='space-y-2'>
                <Label required>Workstream lead</Label>
                <WorkstreamLeadSwitcher
                  projectId={projectId}
                  members={projectMembers}
                  value={leadId}
                  onChange={setLeadId}
                  disabled={isBusy}
                  pendingWorkstreamLead
                  onMembersRefresh={onSuccess}
                  placeholder='Select or create workstream lead'
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isBusy || !name.trim()}>
              {isBusy ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Creating…
                </>
              ) : (
                'Create workstream'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
