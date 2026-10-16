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
import { InitiativePageContent } from '@/features/sections/initiative-page-content'
import { OnboardDivisionContractDialog } from '@/features/sections/components/onboard-division-contract-dialog'
import { ContractOnboardEmptyState } from '@/features/sections/components/contract-onboard-empty-state'
import { ASSESSMENT_FULLSCREEN_DIALOG_CLASS } from '@/features/assessments/assessment-fullscreen-layout'
import type { CascadeAssigneeOption } from '@/lib/contract-cascade/types'
import type { DivisionContract } from '@/sanity/lib/division-contracts/get-division-contract'

const DIVISION_ASSIGNEE_EMPTY_LABEL = 'No managers in this division yet.'
const DIVISION_UNASSIGNED_LABEL = 'Assign a manager'

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
  /** Managers in the AC's division — same list the AC assigns on activities. */
  assigneeOptions?: CascadeAssigneeOption[]
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
  assigneeOptions = [],
}: PlanningContractSupportEditorDialogProps) {
  const router = useRouter()
  const { active: activeFY } = useFinancialYear()
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false)
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const [openActivity, setOpenActivity] = React.useState<{
    objectiveIndex: number
    initiativeIndex: number
    activityKey?: string
  } | null>(null)

  const currentFY =
    divisionContract?.financialYearLabel ?? activeFY.label

  React.useEffect(() => {
    if (!open) {
      setConfirmCloseOpen(false)
      setOnboardOpen(false)
      setOpenActivity(null)
    }
  }, [open])

  const openObjective = openActivity
    ? divisionContract?.objectives?.[openActivity.objectiveIndex]
    : undefined
  const openInitiative =
    openObjective?.initiatives?.[openActivity?.initiativeIndex ?? -1]
  const canEditDivisionContract =
    canManageContract && divisionContract?.status !== 'finalized'

  const handleSelectActivity = React.useCallback(
    (
      objectiveIndex: number,
      initiativeIndex: number,
      activityKey?: string,
    ) => {
      setOpenActivity({ objectiveIndex, initiativeIndex, activityKey })
    },
    [],
  )

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

          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {divisionContract && openActivity && openInitiative ? (
              <InitiativePageContent
                embedded
                onBack={() => setOpenActivity(null)}
                section={{ _id: divisionId, name: divisionName }}
                contractId={divisionContract._id}
                contractApiResource='division-contracts'
                objectiveIndex={openActivity.objectiveIndex}
                initiativeIndex={openActivity.initiativeIndex}
                objectiveCode={openObjective?.code}
                objectiveTitle={openObjective?.title}
                initiative={openInitiative}
                canManage={canEditDivisionContract}
                backHref='#'
                initialActivityKey={openActivity.activityKey}
                assigneeOptions={assigneeOptions}
                assigneeEmptyLabel={DIVISION_ASSIGNEE_EMPTY_LABEL}
                unassignedLabel='Assign a Manager'
              />
            ) : divisionContract ? (
              <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6'>
                <DepartmentContractTree
                  departmentContract={divisionContract}
                  contractsApi='division-contracts'
                  canManageContract={canManageContract}
                  assigneeOptions={assigneeOptions}
                  assigneeEmptyLabel={DIVISION_ASSIGNEE_EMPTY_LABEL}
                  unassignedLabel={DIVISION_UNASSIGNED_LABEL}
                  onSelectActivity={handleSelectActivity}
                />
              </div>
            ) : (
              <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6'>
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
