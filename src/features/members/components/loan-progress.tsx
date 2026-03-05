'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { NumericFormat } from 'react-number-format'

interface LoanProgressProps {
  totalPaid: number
  balanceRemaining: number
}

export function LoanProgress({
  totalPaid,
  balanceRemaining,
}: LoanProgressProps) {
  const totalLoan = totalPaid + balanceRemaining
  const progressPercentage = (totalPaid / totalLoan) * 100

  return (
    <Card className='col-span-4'>
      <CardHeader>
        <CardTitle>Loan Progress</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-col space-y-2'>
          <Progress value={progressPercentage} className='h-2' />
          <div className='flex justify-between text-sm text-muted-foreground'>
            <span>{Math.round(progressPercentage)}% paid</span>
            <span>{100 - Math.round(progressPercentage)}% remaining</span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <p className='text-sm font-medium text-muted-foreground'>
              Total Paid
            </p>
            <p className='text-2xl font-bold text-green-500'>
              <NumericFormat
                thousandSeparator={true}
                displayType='text'
                prefix='UGX '
                value={totalPaid}
              />
            </p>
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium text-muted-foreground'>
              Balance Remaining
            </p>
            <p className='text-2xl font-bold text-red-500'>
              <NumericFormat
                thousandSeparator={true}
                displayType='text'
                prefix='UGX '
                value={balanceRemaining}
              />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
