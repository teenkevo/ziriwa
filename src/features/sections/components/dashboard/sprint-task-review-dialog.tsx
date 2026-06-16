'use client'

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextContent } from '@/components/ui/rich-text-content'

export type SprintTaskReviewAction =
  | 'accepted'
  | 'rejected'
  | 'revisions_requested'
  | 'withdraw_revision'

interface SprintTaskReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskDescription?: string
  taskStatus?: string
  action: SprintTaskReviewAction | ''
  revisionReason: string
  onRevisionReasonChange: (value: string) => void
  isReviewing: boolean
  onConfirm: () => void
}

export function SprintTaskReviewDialog({
  open,
  onOpenChange,
  taskDescription,
  taskStatus,
  action,
  revisionReason,
  onRevisionReasonChange,
  isReviewing,
  onConfirm,
}: SprintTaskReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isReviewing}>
        <DialogHeader>
          <DialogTitle>
            {action === 'accepted' && 'Accept Task'}
            {action === 'rejected' && 'Reject Task'}
            {action === 'revisions_requested' &&
              (taskStatus === 'revisions_requested'
                ? 'Update revision request'
                : 'Request Revisions')}
            {action === 'withdraw_revision' && 'Withdraw revision request'}
          </DialogTitle>
          <DialogDescription>
            Review this sprint task before deciding.
          </DialogDescription>
        </DialogHeader>
        <div className='rounded-md border bg-muted/20 p-3'>
          <RichTextContent
            html={taskDescription}
            className='text-sm'
            emptyText='No description provided.'
          />
        </div>
        <div className='space-y-4 py-2'>
          {action === 'revisions_requested' && (
            <div className='space-y-2'>
              <Label required>Reason for Revisions</Label>
              <Textarea
                placeholder='Explain what changes are needed...'
                value={revisionReason}
                onChange={e => onRevisionReasonChange(e.target.value)}
                rows={3}
                disabled={isReviewing}
              />
            </div>
          )}
          {action === 'accepted' && (
            <p className='text-sm text-muted-foreground'>
              Are you sure you want to accept this task?
            </p>
          )}
          {action === 'rejected' && (
            <p className='text-sm text-muted-foreground'>
              Are you sure you want to reject this task?
            </p>
          )}
          {action === 'withdraw_revision' && (
            <p className='text-sm text-muted-foreground'>
              This will return the task to pending review and remove your
              revision request.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isReviewing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={
              isReviewing ||
              (action === 'revisions_requested' && !revisionReason.trim())
            }
            variant={
              action === 'rejected' || action === 'withdraw_revision'
                ? 'destructive'
                : 'default'
            }
          >
            {isReviewing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                {action === 'revisions_requested' ? 'Saving...' : 'Reviewing...'}
              </>
            ) : action === 'revisions_requested' ? (
              taskStatus === 'revisions_requested' ? (
                'Update request'
              ) : (
                'Submit Feedback'
              )
            ) : action === 'withdraw_revision' ? (
              'Withdraw request'
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
