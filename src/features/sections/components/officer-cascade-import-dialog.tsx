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
import { OfficerCascadeImportSelector } from '@/features/sections/components/officer-cascade-import-selector'
import { OfficerCascadeImportModeDialog } from '@/features/sections/components/officer-cascade-import-mode-dialog'
import { OfficerCascadeRewriteReviewDialog } from '@/features/sections/components/officer-cascade-rewrite-review-dialog'
import { useOfficerCascadeImportFlow } from '@/features/sections/components/use-officer-cascade-import-flow'

interface OfficerCascadeImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  officerContractId: string
  supervisorContractId: string
  isProjectWorkstream?: boolean
  onSuccess?: () => void
}

export function OfficerCascadeImportDialog({
  open,
  onOpenChange,
  sectionId,
  officerContractId,
  supervisorContractId,
  isProjectWorkstream = false,
  onSuccess,
}: OfficerCascadeImportDialogProps) {
  const flow = useOfficerCascadeImportFlow({
    sectionId,
    officerContractId,
    supervisorContractId,
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
              {isProjectWorkstream
                ? "Cascade from workstream lead's contract"
                : "Cascade activities from supervisor's contract"}
            </DialogTitle>
            <DialogDescription>
              {isProjectWorkstream
                ? 'Select tasks from measurable activities your workstream lead has added to their contract.'
                : "Select activities from the supervisor's contract to cascade to your own contract."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={flow.handleSelectSubmit}>
            <div className='py-2 pb-4'>
              <OfficerCascadeImportSelector
                sectionId={sectionId}
                officerContractId={officerContractId}
                supervisorContractId={supervisorContractId}
                isProjectWorkstream={isProjectWorkstream}
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
                disabled={flow.isBusy || flow.importableCount === 0}
              >
                {flow.isBusy ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Preparing…
                  </>
                ) : flow.importableCount === 0 ? (
                  'Select tasks to import'
                ) : (
                  `Continue with ${flow.importableCount} task${flow.importableCount === 1 ? '' : 's'}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <OfficerCascadeImportModeDialog
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

      <OfficerCascadeRewriteReviewDialog
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
