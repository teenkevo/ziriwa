'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
import { OnboardContractDetailsCard } from '@/features/sections/components/onboard-contract-details-card'

interface OnboardOfficerContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  officerId?: string
  sectionName: string
  officerName: string
  /** e.g. Section (mainstream) or Workstream (project). */
  scopeLabel?: string
  /** e.g. Officer or Workstream Member. */
  roleLabel?: string
  /** Upstream role shown above roleLabel (e.g. Workstream Lead for members). */
  upstreamRoleLabel?: string
  upstreamName?: string
  onSuccess?: () => void
}

export function OnboardOfficerContractDialog({
  open,
  onOpenChange,
  sectionId,
  officerId,
  sectionName,
  officerName,
  scopeLabel = 'Section',
  roleLabel = 'Officer',
  upstreamRoleLabel,
  upstreamName,
  onSuccess,
}: OnboardOfficerContractDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const currentFY = getCurrentFinancialYear()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const res = await fetch('/api/officer-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, officerId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to onboard contract')
      }
      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to onboard contract')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isCreating}>
        <DialogHeader>
          <DialogTitle>Onboard Contract</DialogTitle>
          <DialogDescription>
            Cascade from your lead&apos;s contract after onboarding.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <OnboardContractDetailsCard
            rows={[
              { label: scopeLabel, value: sectionName },
              ...(upstreamRoleLabel && upstreamName
                ? [{ label: upstreamRoleLabel, value: upstreamName }]
                : []),
              { label: roleLabel, value: officerName },
              { label: 'Financial Year', value: currentFY.label },
            ]}
          />
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Onboarding...
                </>
              ) : (
                'Onboard contract'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
