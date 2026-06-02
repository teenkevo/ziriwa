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
import type { CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  invalidateSupervisorCascadeOptionsCache,
  SupervisorCascadeImportSelector,
} from '@/features/sections/components/supervisor-cascade-import-selector'

interface OnboardSupervisorContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  supervisorId?: string
  sectionName: string
  supervisorName: string
  /** When false, skip cascade step (no manager contract). */
  hasManagerContract?: boolean
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
  onSuccess,
}: OnboardSupervisorContractDialogProps) {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>('details')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [createdContractId, setCreatedContractId] = React.useState<
    string | null
  >(null)
  const [cascadeSelections, setCascadeSelections] = React.useState<
    CascadeImportSelection[]
  >([])
  const [hasBlockedSelected, setHasBlockedSelected] = React.useState(false)
  const [importableCount, setImportableCount] = React.useState(0)
  const currentFY = getCurrentFinancialYear()

  React.useEffect(() => {
    if (!open) {
      setStep('details')
      setCreatedContractId(null)
      setCascadeSelections([])
      setHasBlockedSelected(false)
      setImportableCount(0)
    }
  }, [open])

  const handleCascadeSelectionChange = React.useCallback(
    (payload: {
      selections: CascadeImportSelection[]
      hasBlockedSelected: boolean
      importableCount: number
    }) => {
      setCascadeSelections(payload.selections)
      setHasBlockedSelected(payload.hasBlockedSelected)
      setImportableCount(payload.importableCount)
    },
    [],
  )

  const finish = () => {
    onOpenChange(false)
    router.refresh()
    onSuccess?.()
  }

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

  const runCascadeImport = async (contractId: string) => {
    const res = await fetch(
      `/api/supervisor-contracts/${contractId}/cascade-import`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections: cascadeSelections }),
      },
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(
        data.error || 'Failed to cascade from manager&apos;s contract',
      )
    }
    return data as { importedActivityKeys?: string[] }
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const contractId = await createContract()
      setCreatedContractId(contractId)
      if (hasManagerContract) {
        setStep('cascade')
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

  const handleCascadeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdContractId) return
    if (hasBlockedSelected) return
    setIsSubmitting(true)
    try {
      if (importableCount > 0) {
        const data = await runCascadeImport(createdContractId)
        invalidateSupervisorCascadeOptionsCache({
          sectionId,
          supervisorContractId: createdContractId,
          supervisorId,
        })
        const importedCount = Array.isArray(data.importedActivityKeys)
          ? data.importedActivityKeys.length
          : importableCount
        toast.success(
          `Cascaded ${importedCount} KPI${importedCount === 1 ? '' : 's'} from manager&apos;s contract`,
        )
      }
      finish()
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to cascade from manager',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipCascade = () => {
    finish()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableClose={isSubmitting}
        className={step === 'cascade' ? 'max-w-lg sm:max-w-xl' : undefined}
      >
        {step === 'details' ? (
          <>
            <DialogHeader>
              <DialogTitle>Onboard supervisor contract</DialogTitle>
              <DialogDescription>
                Create your supervisor contract for the current financial year.
                {hasManagerContract
                  ? ' You can then import items from the manager contract.'
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDetailsSubmit}>
              <div className='space-y-4 py-2 pb-4'>
                <div className='rounded-lg border p-4 space-y-2'>
                  <p className='text-sm font-medium'>Section</p>
                  <p className='text-sm text-muted-foreground'>{sectionName}</p>
                  <p className='text-sm font-medium mt-2'>Supervisor</p>
                  <p className='text-sm text-muted-foreground'>
                    {supervisorName}
                  </p>
                  <p className='text-sm font-medium mt-2'>Financial year</p>
                  <p className='text-sm text-muted-foreground'>
                    {currentFY.label}
                  </p>
                </div>
              </div>
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
                    'Onboard contract'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cascade from manager&apos;s contract</DialogTitle>
              <DialogDescription>
                Choose which manager KPIs to cascade. You can skip and add your
                own items later.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCascadeSubmit}>
              <div className='py-2 pb-4'>
                <SupervisorCascadeImportSelector
                  sectionId={sectionId}
                  supervisorContractId={createdContractId ?? undefined}
                  supervisorId={supervisorId}
                  disabled={isSubmitting}
                  onSelectionChange={handleCascadeSelectionChange}
                />
              </div>
              <DialogFooter className='gap-2 sm:gap-0'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={handleSkipCascade}
                  disabled={isSubmitting}
                >
                  Skip import
                </Button>
                <Button
                  type='submit'
                  disabled={
                    isSubmitting || hasBlockedSelected || importableCount === 0
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Importing…
                    </>
                  ) : importableCount === 0 ? (
                    'Select KPIs to import'
                  ) : (
                    `Import ${importableCount} KPI${importableCount === 1 ? '' : 's'}`
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
