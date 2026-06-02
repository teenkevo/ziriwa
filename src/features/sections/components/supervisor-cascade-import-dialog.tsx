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
import type { CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  invalidateSupervisorCascadeOptionsCache,
  SupervisorCascadeImportSelector,
} from '@/features/sections/components/supervisor-cascade-import-selector'

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
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [cascadeSelections, setCascadeSelections] = React.useState<
    CascadeImportSelection[]
  >([])
  const [hasBlockedSelected, setHasBlockedSelected] = React.useState(false)
  const [importableCount, setImportableCount] = React.useState(0)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasBlockedSelected || importableCount === 0) return
    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/supervisor-contracts/${supervisorContractId}/cascade-import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selections: cascadeSelections }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import')
      }
      invalidateSupervisorCascadeOptionsCache({
        sectionId,
        supervisorContractId,
        supervisorId,
      })
      const importedCount = Array.isArray(data.importedActivityKeys)
        ? data.importedActivityKeys.length
        : importableCount
      toast.success(
        `Cascaded ${importedCount} KPI${importedCount === 1 ? '' : 's'} from manager&apos;s contract`,
      )
      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to import')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableClose={isSubmitting}
        className='max-w-lg sm:max-w-xl'
      >
        <DialogHeader>
          <DialogTitle>
            Cascade activities from manager&apos;s contract
          </DialogTitle>
          <DialogDescription>
            Select activities from the Manager&apos;s Contract to cascade to
            your own contract.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='py-2 pb-4'>
            <SupervisorCascadeImportSelector
              sectionId={sectionId}
              supervisorContractId={supervisorContractId}
              supervisorId={supervisorId}
              disabled={isSubmitting}
              onSelectionChange={handleCascadeSelectionChange}
            />
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
      </DialogContent>
    </Dialog>
  )
}
