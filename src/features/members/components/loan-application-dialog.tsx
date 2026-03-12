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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { applyForLoan } from '@/lib/actions'
import {
  MEMBER_BY_ID_QUERYResult,
  ALL_MEMBERS_QUERYResult,
} from '../../../../sanity.types'
import { NumericFormat } from 'react-number-format'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'

interface LoanApplicationDialogProps {
  member: MEMBER_BY_ID_QUERYResult[number]
  allMembers: ALL_MEMBERS_QUERYResult
  open: boolean
  onOpenChange: (open: boolean) => void
}

const REPAYMENT_PLANS = [
  { label: '3 Months', value: '3_months', months: 3 },
  { label: '6 Months', value: '6_months', months: 6 },
  { label: '12 Months', value: '12_months', months: 12 },
  { label: '18 Months', value: '18_months', months: 18 },
  { label: '24 Months', value: '24_months', months: 24 },
]

export function LoanApplicationDialog({
  member,
  allMembers,
  open,
  onOpenChange,
}: LoanApplicationDialogProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [amount, setAmount] = useState<string>('')
  const [guarantorId, setGuarantorId] = useState<string>('')
  const [repaymentPlan, setRepaymentPlan] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  // Filter out the current member from guarantor options
  const guarantorOptions = allMembers.filter(m => m._id !== member._id)

  const selectedGuarantor = guarantorOptions.find(m => m._id === guarantorId)
  const selectedPlan = REPAYMENT_PLANS.find(p => p.value === repaymentPlan)

  // Calculate estimated monthly payment
  const interestRate = 0.02 // 2%
  const loanAmount = parseFloat(amount) || 0
  const months = selectedPlan?.months || 0
  const monthlyPayment =
    months > 0 ? (loanAmount * (1 + interestRate)) / months : 0
  const totalRepayment = loanAmount * (1 + interestRate)

  const canSubmit =
    amount !== '' &&
    loanAmount > 0 &&
    guarantorId !== '' &&
    repaymentPlan !== '' &&
    !isPending

  const handleSubmit = () => {
    if (!canSubmit) return

    startTransition(async () => {
      const result = await applyForLoan({
        memberId: member._id,
        amount: loanAmount,
        guarantorId,
        repaymentPlan,
        description: description || undefined,
      })

      if (result.status === 'ok') {
        toast.success('Loan application submitted successfully!')
        // Reset form
        setAmount('')
        setGuarantorId('')
        setRepaymentPlan('')
        setDescription('')
        onOpenChange(false)
        // Refresh the page data
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to submit loan application')
      }
    })
  }

  const content = (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='amount' required>Loan Amount</Label>
        <NumericFormat
          id='amount'
          customInput={Input}
          thousandSeparator={true}
          prefix='UGX '
          value={amount}
          onValueChange={values => setAmount(values.value)}
          disabled={isPending}
          placeholder='Enter loan amount'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='guarantor' required>Guarantor</Label>
        <Select
          value={guarantorId}
          onValueChange={setGuarantorId}
          disabled={isPending}
        >
          <SelectTrigger id='guarantor' className='w-full'>
            <SelectValue placeholder='Select a guarantor'>
              {selectedGuarantor
                ? `${selectedGuarantor.fullName} (${selectedGuarantor.memberId})`
                : 'Choose a guarantor...'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {guarantorOptions.map(guarantor => (
              <SelectItem key={guarantor._id} value={guarantor._id}>
                {guarantor.fullName} ({guarantor.memberId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className='text-xs text-muted-foreground'>
          A member cannot guarantee their own loan
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='repaymentPlan' required>Repayment Plan</Label>
        <Select
          value={repaymentPlan}
          onValueChange={setRepaymentPlan}
          disabled={isPending}
        >
          <SelectTrigger id='repaymentPlan' className='w-full'>
            <SelectValue placeholder='Select repayment plan'>
              {selectedPlan ? selectedPlan.label : 'Choose a plan...'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {REPAYMENT_PLANS.map(plan => (
              <SelectItem key={plan.value} value={plan.value}>
                {plan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loanAmount > 0 && selectedPlan && (
        <div className='rounded-lg border bg-muted/50 p-4 space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Loan Amount:</span>
            <span className='text-sm font-semibold'>
              <NumericFormat
                value={loanAmount}
                displayType='text'
                thousandSeparator={true}
                prefix='UGX '
              />
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Interest Rate:</span>
            <span className='text-sm font-semibold'>2%</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Total Repayment:</span>
            <span className='text-sm font-semibold text-primary'>
              <NumericFormat
                value={totalRepayment}
                displayType='text'
                thousandSeparator={true}
                prefix='UGX '
              />
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Monthly Payment:</span>
            <span className='text-sm font-semibold'>
              <NumericFormat
                value={monthlyPayment}
                displayType='text'
                thousandSeparator={true}
                prefix='UGX '
              />
            </span>
          </div>
        </div>
      )}

      <div className='space-y-2'>
        <Label htmlFor='description'>Description (Optional)</Label>
        <Textarea
          id='description'
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={isPending}
          placeholder='Purpose of the loan...'
          rows={3}
        />
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit} className='w-full'>
        {isPending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Submitting...
          </>
        ) : (
          'Submit Application'
        )}
      </Button>
    </div>
  )

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='max-h-[90vh]'>
        <DrawerHeader>
          <DrawerTitle>Apply for Loan</DrawerTitle>
          <DrawerDescription>
            Fill in the details to apply for a loan. A guarantor is required.
          </DrawerDescription>
        </DrawerHeader>
        <div className='px-4 pb-4'>{content}</div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Apply for Loan</DialogTitle>
          <DialogDescription>
            Fill in the details to apply for a loan. A guarantor is required.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
