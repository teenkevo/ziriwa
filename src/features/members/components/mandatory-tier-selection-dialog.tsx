'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { updateMemberTierForCurrentYear } from '@/lib/actions'
import { MEMBER_BY_ID_QUERYResult } from '../../../../sanity.types'
import { NumericFormat } from 'react-number-format'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'

interface MandatoryTierSelectionDialogProps {
  member: MEMBER_BY_ID_QUERYResult[number]
  paymentTiers: Array<{
    _id: string
    title: string | null
    amount: number | null
  }>
  open: boolean
}

export function MandatoryTierSelectionDialog({
  member,
  paymentTiers,
  open,
}: MandatoryTierSelectionDialogProps) {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const [selectedTierId, setSelectedTierId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const isMobile = useIsMobile()

  // Filter out benevolent tiers - only show investment tiers
  const investmentTiers = paymentTiers.filter(
    tier =>
      tier.title &&
      !tier.title.toLowerCase().includes('benevolent') &&
      !tier.title.toLowerCase().includes('benovelent'), // handle typo variant
  )

  const selectedTier = investmentTiers.find(tier => tier._id === selectedTierId)
  const canSubmit = selectedTierId !== '' && !isPending

  const handleSubmit = () => {
    if (!canSubmit) return

    startTransition(async () => {
      const result = await updateMemberTierForCurrentYear(
        member._id,
        selectedTierId,
      )

      if (result.status === 'ok') {
        toast.success('Tier selected successfully!')
        // Refresh the page data
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to select tier')
      }
    })
  }

  // Force dialog/drawer to be open if open prop is true
  if (!open) {
    return null
  }

  const content = (
    <div className='space-y-4 py-4'>
      <div className='space-y-2'>
        <label className='text-sm font-medium'>
          Choose Your Tier <span className='text-destructive'>*</span>
        </label>
        <Select
          value={selectedTierId}
          onValueChange={setSelectedTierId}
          disabled={isPending}
        >
          <SelectTrigger className='w-full h-12'>
            <SelectValue placeholder='Select a contribution tier'>
              {selectedTier
                ? `${selectedTier.title} - UGX ${selectedTier.amount?.toLocaleString()}/month`
                : 'Choose a tier...'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={isMobile ? 'z-[110]' : 'z-[110]'}>
            {investmentTiers.map(tier => (
              <SelectItem key={tier._id} value={tier._id}>
                <div className='flex items-center justify-between w-full'>
                  <div className='flex flex-col'>
                    <span className='font-medium'>{tier.title}</span>
                    <span className='text-xs text-muted-foreground'>
                      <NumericFormat
                        value={(tier.amount || 0) * 12}
                        displayType='text'
                        thousandSeparator={true}
                        prefix='UGX '
                      />{' '}
                      per year
                    </span>
                  </div>
                  <span className='ml-4 text-sm font-semibold'>
                    <NumericFormat
                      value={tier.amount || 0}
                      displayType='text'
                      thousandSeparator={true}
                      prefix='UGX '
                    />
                    /mo
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTier && (
        <div className='rounded-lg border bg-muted/50 p-4 space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Monthly Amount:</span>
            <span className='text-lg font-semibold'>
              <NumericFormat
                value={selectedTier.amount || 0}
                displayType='text'
                thousandSeparator={true}
                prefix='UGX '
              />
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Annual Commitment:</span>
            <span className='text-lg font-semibold text-primary'>
              <NumericFormat
                value={(selectedTier.amount || 0) * 12}
                displayType='text'
                thousandSeparator={true}
                prefix='UGX '
              />
            </span>
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className='w-full text-base'
      >
        {isPending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Saving...
          </>
        ) : (
          'Confirm Selection'
        )}
      </Button>

      <p className='text-xs text-center text-muted-foreground'>
        This selection cannot be changed again this year.
      </p>
    </div>
  )

  return isMobile ? (
    <Drawer
      open={true}
      modal={true}
      dismissible={false}
      onOpenChange={() => {
        // Prevent closing - do nothing to keep it open
      }}
    >
      <DrawerContent className='max-h-[90vh]'>
        <DrawerHeader className='text-left'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
              <AlertCircle className='h-5 w-5 text-primary' />
            </div>
            <div>
              <DrawerTitle className='text-lg'>
                Select Your Contribution Tier for {currentYear}
              </DrawerTitle>
            </div>
          </div>
          <DrawerDescription className='text-sm pt-2'>
            Please select a contribution tier for the current year. This
            selection will determine your monthly contribution amount.
          </DrawerDescription>
        </DrawerHeader>
        <div className='px-4 pb-4'>{content}</div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={true} modal={true}>
      <DialogContent
        className='sm:max-w-[500px]'
        onInteractOutside={e => {
          // Prevent closing by clicking outside
          e.preventDefault()
        }}
        onEscapeKeyDown={e => {
          // Prevent closing with Escape key
          e.preventDefault()
        }}
      >
        <DialogHeader>
          <div className='flex items-center gap-3 mb-2'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
              <AlertCircle className='h-5 w-5 text-primary' />
            </div>
            <div>
              <DialogTitle className='text-lg'>
                Select Your Contribution Tier for {currentYear}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className='text-sm pt-2'>
            Please select a contribution tier for the current year. This
            selection will determine your monthly contribution amount.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
