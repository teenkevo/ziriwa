'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NumericFormat } from 'react-number-format'
import { User } from './data/schema'
import { Badge } from '@/components/ui/badge'
import { DollarSign, HeartHandshake } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getUsers } from '@/lib/actions'
import Loading from '@/app/(phoenix)/loading'
import { MemberTable } from './member-table'
import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { LoanProgress } from './components/loan-progress'
import MemberLoans from './member-loans'
import { TierSelection } from './components/tier-selection'
import { MandatoryTierSelectionDialog } from './components/mandatory-tier-selection-dialog'
import { LoanApplicationDialog } from './components/loan-application-dialog'
import {
  ALL_MEMBERS_QUERYResult,
  MEMBER_BY_ID_QUERYResult,
} from '../../../sanity.types'
import { Button } from '@/components/ui/button'
import { HandCoins } from 'lucide-react'

interface DashboardCardProps {
  title: string
  value: string | number | React.ReactNode
  growth?: string
  icon: React.ReactNode
  type: 'investment' | 'benevolent' | 'loan'
}

export default function Member({
  member,
  paymentTiers,
  allMembers,
}: {
  member: MEMBER_BY_ID_QUERYResult[number]
  paymentTiers: Array<{
    _id: string
    title: string | null
    amount: number | null
  }>
  allMembers: ALL_MEMBERS_QUERYResult
}) {
  const [loanDialogOpen, setLoanDialogOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<
    'investment' | 'benevolent' | 'loan'
  >('investment')

  function DashboardCard({
    title,
    value,
    growth,
    icon,
    type,
  }: DashboardCardProps) {
    return (
      <Card
        className={`bg-primary/5 shadow-md transition-all cursor-pointer hover:shadow-lg ${
          selectedCard === type ? 'border-2 border-primary' : ''
        }`}
        onClick={() => setSelectedCard(type)}
      >
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{value}</div>
          <p className='text-xs text-muted-foreground'>{growth}</p>
        </CardContent>
      </Card>
    )
  }

  const payments = member?.payments

  const investmentPayments = payments?.filter(
    payment => payment.type === 'investment',
  )

  const benevolentPayments = payments?.filter(
    payment => payment.type === 'benovelent',
  )

  const loanPayments = payments?.filter(payment => payment.type === 'other')

  const totalInvestment = investmentPayments?.reduce(
    (total, payment) => total + (payment.amountPaid ?? 0),
    0,
  )

  const totalBenevolent = benevolentPayments?.reduce(
    (total, payment) => total + (payment.amountPaid ?? 0),
    0,
  )

  const totalLoan = loanPayments?.reduce(
    (total, payment) => total + (payment.amountPaid ?? 0),
    0,
  )

  function isPreviousMonthPaid(
    member: ALL_MEMBERS_QUERYResult[number],
  ): boolean {
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() // 0=Jan, 1=Feb, …, 5=Jun, … 11=Dec

    // Compute previous month/year
    if (month === 0) {
      month = 11 // December
      year = year - 1 // go back one calendar year
    } else {
      month = month - 1
    }
    // At this point, `year` and `month` represent the previous month.
    // e.g. if today is 2025-06-01, then year=2025, month=5 (June→5), so previous=month=4 (May) & year=2025.

    // 1. Look up the tier for that year
    const tierEntry = member.tierHistory?.find(t => t.year === year)
    const monthlyTier = tierEntry?.tier?.amount ?? 0

    // 2. Sum all investment payments in that exact year/month
    const paymentsThisMonth = member.payments.filter(
      txn =>
        txn.type === 'investment' &&
        txn.year === year &&
        // If txn.month is stored 1–12 instead of 0–11, adjust accordingly.
        // Here we assume txn.month is 1-Jan, 2-Feb, … so compare to month+1.
        txn.month === month + 1,
    )
    const totalPaid = paymentsThisMonth.reduce(
      (sum, txn) => sum + (txn.amountPaid ?? 0),
      0,
    )

    // 3. If monthlyTier is zero, treat it as “nothing owed → paid”
    if (monthlyTier === 0) {
      return true
    }

    // 4. Return whether they covered at least that month’s tier
    return totalPaid >= monthlyTier
  }

  const memberStatus = member.status

  const isActive = memberStatus === 'active'

  // Add this check
  if (!member) {
    return <div>Member not found</div>
  }

  const noArrears = isPreviousMonthPaid(member)

  // Check if member has a tier entry in tierHistory for the current year
  const currentYear = new Date().getFullYear()
  const hasCurrentYearTierInHistory =
    member.tierHistory?.some(entry => entry.year === currentYear) ?? false

  // Show mandatory dialog if no tier entry exists in tierHistory for current year
  const showMandatoryDialog = !hasCurrentYearTierInHistory

  return (
    <div className=' p-4 md:p-8'>
      {/* Mandatory Tier Selection Dialog */}
      <MandatoryTierSelectionDialog
        member={member}
        paymentTiers={paymentTiers}
        open={showMandatoryDialog}
      />
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold'>{member?.fullName}</h1>
            <div className='flex items-center gap-2 my-1'>
              <p className='text-muted-foreground'>
                Member ID: {member?.memberId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Application Dialog */}
      <LoanApplicationDialog
        member={member}
        allMembers={allMembers}
        open={loanDialogOpen}
        onOpenChange={setLoanDialogOpen}
      />

      <div className='space-y-4'>
        {/* Tier Selection */}
        <TierSelection member={member} />
        {/* Desktop view */}
        <div className='hidden md:grid gap-4 md:grid-cols-3'>
          <DashboardCard
            type='investment'
            title='Total Investment Contributions'
            icon={<DollarSign className='text-primary' />}
            value={
              <NumericFormat
                thousandSeparator={true}
                displayType='text'
                prefix={'UGX '}
                value={totalInvestment}
              />
            }
          />
          <DashboardCard
            type='benevolent'
            title='Total Benovelent Contributions'
            icon={<HeartHandshake className='text-primary' />}
            value={
              <NumericFormat
                thousandSeparator={true}
                displayType='text'
                prefix={'UGX '}
                value={totalBenevolent}
              />
            }
          />
          <DashboardCard
            type='loan'
            title='Total Loans'
            icon={<HandCoins className='text-primary' />}
            value={
              <>
                <NumericFormat
                  thousandSeparator={true}
                  displayType='text'
                  prefix={'UGX '}
                  value={totalLoan}
                />
                <p
                  className={`text-xs font-normal my-2 ${
                    !noArrears ? 'text-green-500' : 'text-destructive'
                  }`}
                >
                  {noArrears && isActive
                    ? 'No Arrears'
                    : !isActive
                      ? 'Inactive'
                      : 'In Arrears'}
                </p>
              </>
            }
          />
        </div>

        {/* Mobile view */}
        <div className='md:hidden w-full'>
          <Accordion defaultValue='Investment' type='single' collapsible>
            <AccordionItem value='Investment'>
              <AccordionTrigger className='no-underline'>
                <div className='w-full'>
                  <DashboardCard
                    type='investment'
                    title='Total Investment Contributions'
                    icon={<DollarSign className='text-primary' />}
                    value={
                      <NumericFormat
                        thousandSeparator={true}
                        displayType='text'
                        prefix={'UGX '}
                        value={totalInvestment}
                      />
                    }
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <MemberTable member={member} category='investment' />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='Benevolent'>
              <AccordionTrigger>
                <div className='w-full'>
                  <DashboardCard
                    type='benevolent'
                    title='Total Benovelent Contributions'
                    icon={<HeartHandshake className='text-primary' />}
                    value={
                      <NumericFormat
                        thousandSeparator={true}
                        displayType='text'
                        prefix={'UGX '}
                        value={totalBenevolent}
                      />
                    }
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <MemberTable member={member} category='benovelent' />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value='Loan'>
              <AccordionTrigger>
                <div className='w-full'>
                  <DashboardCard
                    type='loan'
                    title='Total Loans'
                    icon={<HandCoins className='text-primary' />}
                    value={
                      <>
                        <NumericFormat
                          thousandSeparator={true}
                          displayType='text'
                          prefix={'UGX '}
                          value={totalLoan}
                        />
                        <p
                          className={`text-xs font-normal my-2 ${
                            !noArrears ? 'text-green-500' : 'text-destructive'
                          }`}
                        >
                          {noArrears && isActive
                            ? 'No Arrears'
                            : !isActive
                              ? 'Inactive'
                              : 'In Arrears'}
                        </p>
                      </>
                    }
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <MemberLoans member={member} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Desktop table view */}
        <div className='hidden md:block'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            key={selectedCard}
          >
            {selectedCard === 'loan' && (
              <div className='flex justify-end'>
                <Button onClick={() => setLoanDialogOpen(true)}>
                  <HandCoins className='mr-2 h-4 w-4' />
                  Apply for Loan
                </Button>
              </div>
            )}
            {selectedCard === 'loan' ? (
              <MemberLoans member={member} />
            ) : (
              <MemberTable member={member} category={selectedCard} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
