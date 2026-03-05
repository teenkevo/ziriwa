import React from 'react'
import { LoanProgress } from './components/loan-progress'
import { User } from './data/schema'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { NumericFormat } from 'react-number-format'
import { format } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { MemberTable } from './member-table'
import { MEMBER_BY_ID_QUERYResult } from '../../../sanity.types'

function LoanCard({
  loan,
  startDate,
  futureLoanRepayment,
  totalPaid,
}: {
  loan: number
  startDate: string
  futureLoanRepayment: number
  totalPaid: number
}) {
  const progressPercentage = (totalPaid / futureLoanRepayment) * 100
  return (
    <Card className='w-full border-2 p-6 space-y-4'>
      {/* Loan ID and Last Update */}
      <div className='grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4'>
        <div>
          <p className='text-sm text-muted-foreground'>Loan Amount</p>
          <NumericFormat
            className='text-lg font-semibold'
            thousandSeparator={true}
            displayType='text'
            prefix={'UGX '}
            value={loan}
          />
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Interest Rate</p>
          <p className='text-xl font-semibold text-orange-500'>2%</p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>Loan Start Date</p>
          <p className='font-medium'>
            {format(new Date(startDate), 'LLL dd, y')}
          </p>
        </div>
        <div>
          <p className='text-sm text-muted-foreground'>
            Loan + Accrued Interest
          </p>
          <NumericFormat
            className='text-lg font-semibold'
            thousandSeparator={true}
            displayType='text'
            prefix={'UGX '}
            value={futureLoanRepayment}
          />
        </div>
        <div className='space-y-4'>
          <p className='text-sm text-muted-foreground'>Total Paid</p>
          <NumericFormat
            className='text-lg font-semibold'
            thousandSeparator={true}
            displayType='text'
            prefix={'UGX '}
            value={totalPaid}
          />
        </div>
        <div className='items-center space-y-2'>
          <Progress value={progressPercentage} className='h-2 mt-2' />
          <div className='flex justify-between text-sm text-muted-foreground'>
            <span className='text-green-500'>
              {Math.round(progressPercentage)}% paid
            </span>
            <span className='text-red-500'>
              {100 - Math.round(progressPercentage)}% remaining
            </span>
          </div>
        </div>
      </div>
      {/* <MemberTable member={member} category='Benevolent' /> */}
    </Card>
  )
}

export default function MemberLoans({
  member,
}: {
  member: MEMBER_BY_ID_QUERYResult[number]
}) {
  const payments = member?.payments

  const loanPayments = payments?.filter(payment => payment.type === 'other')

  const interestRate = 0.02

  const loanStartDate = new Date(loanPayments?.[0]?.paymentDate!)

  // Calculate months elapsed since loan start
  const monthsElapsed = loanStartDate
    ? (new Date().getTime() - loanStartDate.getTime()) /
      (1000 * 60 * 60 * 24 * 30.44)
    : 0

  const totalPaid = 400000

  const futureLoanRepayment = Math.round(
    loanPayments?.[0]?.amountPaid! * Math.pow(1 + interestRate, monthsElapsed),
  )

  const balanceRemaining = futureLoanRepayment - totalPaid

  return loanPayments.map(payment => {
    return (
      <LoanCard
        key={payment._id}
        loan={payment.amountPaid ?? 0}
        startDate={payment.paymentDate ?? ''}
        futureLoanRepayment={futureLoanRepayment}
        totalPaid={totalPaid}
      />
    )
  })
}
