import { FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ContractOnboardEmptyStateProps {
  financialYearLabel: string
  description: string
  canOnboard: boolean
  onOnboard: () => void
  missingAssigneeMessage?: string
}

/** Empty contract tab before a FY contract exists (manager, PM, lead, member). */
export function ContractOnboardEmptyState({
  financialYearLabel,
  description,
  canOnboard,
  onOnboard,
  missingAssigneeMessage,
}: ContractOnboardEmptyStateProps) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 text-muted-foreground'>
        <FileText className='h-5 w-5' />
        <span>No contract for {financialYearLabel}</span>
      </div>
      <p className='text-sm'>{description}</p>
      {canOnboard ? (
        <Button onClick={onOnboard}>Onboard Contract</Button>
      ) : missingAssigneeMessage ? (
        <p className='text-sm text-muted-foreground'>{missingAssigneeMessage}</p>
      ) : null}
    </div>
  )
}
