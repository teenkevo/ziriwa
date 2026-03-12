'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

interface SubmitReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: StakeholderEntry | null
  stakeholderIndex: number | null
  engagementId: string
  onSuccess: () => void
}

export function SubmitReportDialog({
  open,
  onOpenChange,
  entry,
  stakeholderIndex,
  engagementId,
  onSuccess,
}: SubmitReportDialogProps) {
  const [report, setReport] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open && entry) {
      setReport(entry.engagementReport ?? '')
    }
  }, [open, entry])

  const handleSubmit = async () => {
    if (stakeholderIndex === null) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/stakeholder-engagement/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'updateReport',
          payload: {
            stakeholderIndex,
            engagementReport: report,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save report')
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Submit Engagement Report</DialogTitle>
          <DialogDescription>
            {entry
              ? `Report for ${entry.name}${entry.designation ? ` (${entry.designation})` : ''}`
              : 'Write your stakeholder engagement report.'}
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto min-h-0'>
          <RichTextEditor
            value={report}
            onChange={setReport}
            placeholder='Describe the engagement outcomes, key points discussed, follow-up actions, and any other relevant details...'
            minHeight='280px'
          />
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Saving...
              </>
            ) : (
              'Save Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
