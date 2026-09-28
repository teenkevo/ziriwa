'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useFinancialYear } from '@/contexts/financial-year-context'
import { DepartmentContractTree } from '@/features/sections/components/department-contract-tree'
import { OnboardDivisionContractDialog } from '@/features/sections/components/onboard-division-contract-dialog'
import { ContractOnboardEmptyState } from '@/features/sections/components/contract-onboard-empty-state'
import { ASSESSMENT_FULLSCREEN_DIALOG_CLASS } from '@/features/assessments/assessment-fullscreen-layout'
import type { DivisionContract } from '@/sanity/lib/division-contracts/get-division-contract'

interface PlanningContractSupportEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  divisionId: string
  divisionName: string
  divisionContract: DivisionContract | null
  /** AC staff id — owner of the division contract. */
  assistantCommissionerId: string
  assistantCommissionerName: string
  canManageContract: boolean
}

/**
 * Full-screen editor for DIP-Planning staff helping populate the AC's division
 * contract (not the planning section / supervisor personal contract).
 */
export function PlanningContractSupportEditorDialog({
  open,
  onOpenChange,
  divisionId,
  divisionName,
  divisionContract,
  assistantCommissionerId,
  assistantCommissionerName,
  canManageContract,
}: PlanningContractSupportEditorDialogProps) {
  const router = useRouter()
  const { active: activeFY } = useFinancialYear()
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false)
  const [onboardOpen, setOnboardOpen] = React.useState(false)

  const currentFY =
    divisionContract?.financialYearLabel ?? activeFY.label

  React.useEffect(() => {
    if (!open) {
      setConfirmCloseOpen(false)
      setOnboardOpen(false)
    }
  }, [open])

  function requestClose() {
    setConfirmCloseOpen(true)
  }

  function confirmClose() {
    setConfirmCloseOpen(false)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={next => {
          if (!next) {
            requestClose()
            return
          }
          onOpenChange(true)
        }}
      >
        <DialogContent
          disableClose
          className={ASSESSMENT_FULLSCREEN_DIALOG_CLASS}
          onEscapeKeyDown={event => {
            event.preventDefault()
            requestClose()
          }}
          onInteractOutside={event => {
            event.preventDefault()
          }}
        >
          <DialogHeader className='shrink-0 space-y-1 border-b px-4 py-3 sm:px-6'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 space-y-1'>
                <DialogTitle className='text-lg'>
                  Onboard Assistant Commissioner contract
                </DialogTitle>
                <DialogDescription>
                  Add SSMARTA objectives, initiatives, and measurable activities
                  for {divisionName}.
                </DialogDescription>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='shrink-0 gap-1.5'
                onClick={requestClose}
              >
                <X className='size-4' aria-hidden />
                Close
              </Button>
            </div>
          </DialogHeader>

          <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6'>
            {divisionContract ? (
              <DepartmentContractTree
                departmentContract={divisionContract}
                contractsApi='division-contracts'
                canManageContract={canManageContract}
              />
            ) : (
              <div className='space-y-4'>
                <OnboardDivisionContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  divisionId={divisionId}
                  assistantCommissionerId={assistantCommissionerId}
                  divisionName={divisionName}
                  assistantCommissionerName={assistantCommissionerName}
                  onSuccess={() => {
                    setOnboardOpen(false)
                    router.refresh()
                  }}
                />
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description='Onboard the Assistant Commissioner division contract to add SSMARTA objectives, initiatives, and measurable activities.'
                  canOnboard={
                    canManageContract && Boolean(assistantCommissionerId)
                  }
                  onOnboard={() => setOnboardOpen(true)}
                  missingAssigneeMessage={
                    canManageContract && !assistantCommissionerId
                      ? 'The Assistant Commissioner staff record could not be resolved for this contract.'
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close contract editor?</AlertDialogTitle>
            <AlertDialogDescription>
              Make sure you have finished saving objectives and activities.
              Unsaved work in open forms may be lost if you close now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              Close editor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
