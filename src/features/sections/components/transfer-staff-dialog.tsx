'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SectionPicker } from '@/components/section-picker'
import type { SectionStaffTableRow } from '@/features/sections/components/section-staff-table'

interface TransferStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  staff: SectionStaffTableRow | null
  onSuccess: () => void
}

export function TransferStaffDialog({
  open,
  onOpenChange,
  sectionId,
  staff,
  onSuccess,
}: TransferStaffDialogProps) {
  const [toSectionId, setToSectionId] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setToSectionId('')
      setReason('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!staff || !toSectionId) {
      toast.error('Select a destination section')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/staff-transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff._id,
          transferType: 'section',
          fromSectionId: sectionId,
          toSectionId,
          reason,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit transfer request')
      }
      toast.success('Transfer request submitted for approval')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request section transfer</DialogTitle>
            <DialogDescription>
              Moves {staff?.fullName ?? 'staff'} to another section. Requires
              approval from immediate supervisor up to Commissioner General.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Destination section</Label>
              <SectionPicker
                value={toSectionId}
                onValueChange={setToSectionId}
                excludeSectionId={sectionId}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='transfer-reason'>Reason</Label>
              <Textarea
                id='transfer-reason'
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder='Why is this move needed?'
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
            <Button type='submit' disabled={isSaving}>
              {isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Submit for approval'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
