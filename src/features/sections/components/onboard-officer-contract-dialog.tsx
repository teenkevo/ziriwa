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

interface OnboardOfficerContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  officerId?: string
  sectionName: string
  officerName: string
  onSuccess?: () => void
}

export function OnboardOfficerContractDialog({
  open,
  onOpenChange,
  sectionId,
  officerId,
  sectionName,
  officerName,
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
          <DialogTitle>Onboard officer contract</DialogTitle>
          <DialogDescription>
            Create your officer contract for the current financial year
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='rounded-lg border p-4 space-y-2'>
              <p className='text-sm font-medium'>Section</p>
              <p className='text-sm text-muted-foreground'>{sectionName}</p>
              <p className='text-sm font-medium mt-2'>Officer</p>
              <p className='text-sm text-muted-foreground'>{officerName}</p>
              <p className='text-sm font-medium mt-2'>Financial year</p>
              <p className='text-sm text-muted-foreground'>{currentFY.label}</p>
            </div>
          </div>
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
