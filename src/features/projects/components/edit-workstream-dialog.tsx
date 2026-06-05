'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WorkstreamLeadSwitcher } from '@/features/projects/components/workstream-lead-switcher'
import type { StaffPickerMember } from '@/lib/staff-picker'

export interface WorkstreamEditTarget {
  _id: string
  name: string
  workstreamLeadId?: string | null
}

interface EditWorkstreamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  workstream: WorkstreamEditTarget
  projectMembers: StaffPickerMember[]
  onSuccess?: () => void
}

export function EditWorkstreamDialog({
  open,
  onOpenChange,
  projectId,
  workstream,
  projectMembers,
  onSuccess,
}: EditWorkstreamDialogProps) {
  const [name, setName] = React.useState('')
  const [leadId, setLeadId] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setName(workstream.name)
    setLeadId(workstream.workstreamLeadId ?? '')
  }, [open, workstream])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/workstreams/${workstream._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmed,
            workstreamLeadStaffId: leadId,
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to update workstream',
        )
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update workstream')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit workstream</DialogTitle>
            <DialogDescription>
              Update the workstream name or assign a workstream lead.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-workstream-name'>Workstream name</Label>
              <Input
                id='edit-workstream-name'
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label>Workstream lead</Label>
              <WorkstreamLeadSwitcher
                projectId={projectId}
                members={projectMembers}
                value={leadId}
                onChange={setLeadId}
                disabled={isSaving}
                workstreamId={workstream._id}
                workstreamName={name.trim() || workstream.name}
                onMembersRefresh={onSuccess}
                placeholder='Select or create workstream lead'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
