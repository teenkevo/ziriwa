'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  getSupervisorCascadeDialogTitle,
  getSupervisorUpstreamRoleLabel,
} from '@/lib/supervisor-cascade-labels'
import { OnboardContractDetailsCard } from '@/features/sections/components/onboard-contract-details-card'
import {
  SupervisorCascadeImportSelector,
} from '@/features/sections/components/supervisor-cascade-import-selector'
import { SupervisorCascadeImportModeDialog } from '@/features/sections/components/supervisor-cascade-import-mode-dialog'
import { SupervisorCascadeRewriteReviewDialog } from '@/features/sections/components/supervisor-cascade-rewrite-review-dialog'
import { useSupervisorCascadeImportFlow } from '@/features/sections/components/use-supervisor-cascade-import-flow'

interface OnboardSupervisorContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  supervisorId?: string
  sectionName: string
  supervisorName: string
  /** When false, skip cascade step (no manager contract). */
  hasManagerContract?: boolean
  /** Project workstream lead — upstream is PM contract, not mainstream section manager. */
  isProjectWorkstream?: boolean
  scopeLabel?: string
  roleLabel?: string
  upstreamRoleLabel?: string
  onSuccess?: () => void
}

type Step = 'details' | 'cascade'

export function OnboardSupervisorContractDialog({
  open,
  onOpenChange,
  sectionId,
  supervisorId,
  sectionName,
  supervisorName,
  hasManagerContract = true,
  isProjectWorkstream = false,
  scopeLabel = 'Section',
  roleLabel = 'Supervisor',
  upstreamRoleLabel,
  onSuccess,
}: OnboardSupervisorContractDialogProps) {
  const effectiveUpstreamRoleLabel =
    upstreamRoleLabel ?? getSupervisorUpstreamRoleLabel(isProjectWorkstream)
  const router = useRouter()
  const [step, setStep] = React.useState<Step>('details')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [createdContractId, setCreatedContractId] = React.useState<
    string | null
  >(null)
  const currentFY = getCurrentFinancialYear()

  const finish = React.useCallback(() => {
    onOpenChange(false)
    router.refresh()
    onSuccess?.()
  }, [onOpenChange, onSuccess, router])

  const flow = useSupervisorCascadeImportFlow({
    sectionId,
    supervisorContractId: createdContractId ?? undefined,
    supervisorId,
    isProjectWorkstream,
    onComplete: finish,
  })

  React.useEffect(() => {
    if (!open) {
      setStep('details')
      setCreatedContractId(null)
      flow.resetFlow()
    }
  }, [open, flow.resetFlow])

  const createContract = async (): Promise<string> => {
    const res = await fetch('/api/supervisor-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId, supervisorId }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to onboard contract')
    }
    return data.id as string
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const contractId = await createContract()
      setCreatedContractId(contractId)
      if (hasManagerContract) {
        setStep('cascade')
        flow.resetFlow()
      } else {
        finish()
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to onboard contract')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipCascade = () => {
    finish()
  }

  const cascadeUiOpen = open && step === 'cascade'
  const cascadeDialogTitle = getSupervisorCascadeDialogTitle(isProjectWorkstream)

  return (
    <>
      <Dialog open={open && step === 'details'} onOpenChange={onOpenChange}>
        <DialogContent disableClose={isSubmitting}>
          <DialogHeader>
            <DialogTitle>Onboard Contract</DialogTitle>
            <DialogDescription>
              {hasManagerContract
                ? `Cascade from the ${effectiveUpstreamRoleLabel} contract after onboarding.`
                : `Contract for ${currentFY.label}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDetailsSubmit}>
            <OnboardContractDetailsCard
              rows={[
                { label: scopeLabel, value: sectionName },
                { label: roleLabel, value: supervisorName },
                { label: 'Financial Year', value: currentFY.label },
              ]}
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Creating…
                  </>
                ) : hasManagerContract ? (
                  'Continue'
                ) : (
                  'Onboard Contract'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cascadeUiOpen && flow.step === 'select'}
        onOpenChange={nextOpen => {
          if (!nextOpen && !flow.isBusy) finish()
        }}
      >
        <DialogContent
          disableClose={flow.isBusy || isSubmitting}
          className='max-w-lg sm:max-w-xl'
        >
          <DialogHeader>
            <DialogTitle>{cascadeDialogTitle}</DialogTitle>
            <DialogDescription>
              Select KPIs to import, or skip for now.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={flow.handleSelectSubmit}>
            <div className='py-2 pb-4'>
              <SupervisorCascadeImportSelector
                sectionId={sectionId}
                supervisorContractId={createdContractId ?? undefined}
                supervisorId={supervisorId}
                isProjectWorkstream={isProjectWorkstream}
                disabled={flow.isBusy || isSubmitting}
                onSelectionChange={flow.handleSelectionChange}
              />
            </div>
            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='ghost'
                onClick={handleSkipCascade}
                disabled={flow.isBusy || isSubmitting}
              >
                Skip import
              </Button>
              <Button
                type='submit'
                disabled={
                  flow.isBusy ||
                  isSubmitting ||
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
        open={cascadeUiOpen && flow.step === 'mode'}
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
        open={cascadeUiOpen && flow.step === 'review'}
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
