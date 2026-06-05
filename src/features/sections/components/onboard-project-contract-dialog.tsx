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

interface OnboardProjectContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectManagerId: string
  projectName: string
  projectManagerName: string
  onSuccess?: () => void
}

export function OnboardProjectContractDialog({
  open,
  onOpenChange,
  projectId,
  projectManagerId,
  projectName,
  projectManagerName,
  onSuccess,
}: OnboardProjectContractDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const currentFY = getCurrentFinancialYear()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const res = await fetch('/api/project-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectManagerId }),
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
            Cascades to workstream leads and members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <OnboardContractDetailsCard
            rows={[
              { label: 'Project', value: projectName },
              { label: 'Project Manager', value: projectManagerName },
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
            <Button type='submit' disabled={isCreating || !projectManagerId}>
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Onboarding...
                </>
              ) : (
                'Onboard Contract'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
