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

interface SubmitForReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  onDecline: () => void
  isSubmitting?: boolean
}

export function SubmitForReviewDialog({
  open,
  onOpenChange,
  onConfirm,
  onDecline,
  isSubmitting = false,
}: SubmitForReviewDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const handleConfirm = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = () => {
    onDecline()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={newOpen => {
        if (isLoading && !newOpen) return
        onOpenChange(newOpen)
      }}
    >
      <DialogContent
        className='max-w-md'
        onInteractOutside={e => isLoading && e.preventDefault()}
        onEscapeKeyDown={e => isLoading && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Send for supervisor review?</DialogTitle>
          <DialogDescription>
            Should this main deliverable be sent for review to the supervisor?
            Once sent, the deliverable will be locked and cannot be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={handleDecline}
            disabled={isSubmitting || isLoading}
          >
            Not yet ready
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || isLoading}>
            {(isSubmitting || isLoading) ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Sending...
              </>
            ) : (
              'Send for review'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
