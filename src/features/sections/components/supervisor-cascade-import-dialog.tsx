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
import {
  SupervisorCascadeImportSelector,
} from '@/features/sections/components/supervisor-cascade-import-selector'
import { SupervisorCascadeImportModeDialog } from '@/features/sections/components/supervisor-cascade-import-mode-dialog'
import { SupervisorCascadeRewriteReviewDialog } from '@/features/sections/components/supervisor-cascade-rewrite-review-dialog'
import { useSupervisorCascadeImportFlow } from '@/features/sections/components/use-supervisor-cascade-import-flow'

interface SupervisorCascadeImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  supervisorContractId: string
  supervisorId?: string
  onSuccess?: () => void
}

export function SupervisorCascadeImportDialog({
  open,
  onOpenChange,
  sectionId,
  supervisorContractId,
  supervisorId,
  onSuccess,
}: SupervisorCascadeImportDialogProps) {
  const flow = useSupervisorCascadeImportFlow({
    sectionId,
    supervisorContractId,
    supervisorId,
    onComplete: () => {
      onSuccess?.()
      onOpenChange(false)
    },
  })

  React.useEffect(() => {
    if (!open) flow.resetFlow()
  }, [open, flow.resetFlow])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !flow.isBusy) {
      flow.resetFlow()
    }
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Dialog
        open={open && flow.step === 'select'}
        onOpenChange={handleOpenChange}
      >
        <DialogContent
          disableClose={flow.isBusy}
          className='max-w-lg sm:max-w-xl'
        >
          <DialogHeader>
            <DialogTitle>
              Cascade activities from manager&apos;s contract
            </DialogTitle>
            <DialogDescription>
              Select activities from the manager&apos;s contract to cascade to
              your own contract.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={flow.handleSelectSubmit}>
            <div className='py-2 pb-4'>
              <SupervisorCascadeImportSelector
                sectionId={sectionId}
                supervisorContractId={supervisorContractId}
                supervisorId={supervisorId}
                disabled={flow.isBusy}
                onSelectionChange={flow.handleSelectionChange}
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleOpenChange(false)}
                disabled={flow.isBusy}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={
                  flow.isBusy ||
                  flow.hasBlockedSelected ||
                  flow.importableCount === 0
                }
              >
                {flow.isBusy ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Preparing…
                  </>
                ) : flow.importableCount === 0 ? (
                  'Select KPIs to import'
                ) : (
                  `Continue with ${flow.importableCount} KPI${flow.importableCount === 1 ? '' : 's'}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SupervisorCascadeImportModeDialog
        open={open && flow.step === 'mode'}
        onOpenChange={nextOpen => {
          if (!nextOpen) flow.handleBackFromMode()
        }}
        importableCount={flow.importableCount}
        aiEnabled={flow.aiEnabled}
        selectedMode={flow.importMode}
        onSelectMode={flow.setImportMode}
        isLoadingAiStatus={flow.isLoadingAiStatus}
        isSubmitting={flow.isBusy && flow.step === 'mode'}
        onBack={flow.handleBackFromMode}
        onFinish={() => void flow.handleModeFinish()}
      />

      <SupervisorCascadeRewriteReviewDialog
        open={open && flow.step === 'review'}
        onOpenChange={nextOpen => {
          if (!nextOpen) flow.handleBackFromReview()
        }}
        items={flow.previewItems}
        drafts={flow.drafts}
        onDraftsChange={flow.setDrafts}
        modeLabel={
          flow.reviewMode === 'ai' ? 'AI suggestions' : 'As-is preview'
        }
        isSubmitting={flow.isBusy}
        onConfirmImport={() => void flow.handleConfirmReviewImport()}
        onBack={flow.handleBackFromReview}
      />
    </>
  )
}
