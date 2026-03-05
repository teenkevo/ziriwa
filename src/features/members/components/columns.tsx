'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

import { statuses } from '../data/data'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import { NumericFormat } from 'react-number-format'
import Link from 'next/link'
import { Check, CircleX, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ALL_MEMBERS_QUERYResult } from '../../../../sanity.types'

export const columns: ColumnDef<ALL_MEMBERS_QUERYResult[number]>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'memberId',
    header: () => null,
    cell: () => null,
  },
  {
    accessorKey: 'fullName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Full Name' />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex space-x-2 '>
          <Link
            className='hover:underline min-w-[100px] max-w-[150px] truncate'
            href={`/members/${row.original._id}`}
          >
            {row.original.fullName}
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: '_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Member ID' />
    ),
    cell: ({ row }) => (
      <div className='flex space-x-2 '>
        <Link
          className='hover:underline min-w-[90px]'
          href={`/members/${row.original._id}`}
        >
          MEM-{row.original.memberId}
        </Link>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: 'yearsFulfilled',
    header: 'Years Fulfilled',
    cell: ({ row }) => {
      const INVESTMENT_YEARS = [2021, 2022, 2023, 2024, 2025]

      function checkInvestmentTransactionsForYears(
        member: ALL_MEMBERS_QUERYResult[number],
        years: number[],
      ): { year: number; fulfilled: boolean; percentage: number }[] {
        return years.map(year => {
          // 1. Lookup that year’s tier (default to 0 if none)
          const tierEntry = member.tierHistory?.find(t => t.year === year)
          const monthlyTier = tierEntry?.tier?.amount ?? 0

          // 2. Sum all investment payments for that calendar year
          const paymentsThisYear = member.payments.filter(
            txn => txn.type === 'investment' && txn.year === year,
          )
          const totalPaid = paymentsThisYear.reduce(
            (sum, txn) => sum + (txn.amountPaid ?? 0),
            0,
          )

          // 4. Compute expected total = monthlyTier × monthsCounted
          const expectedTotal = monthlyTier * 12

          // 5. Percentage and fulfillment (cap percentage at 100%)
          const percentage =
            expectedTotal === 0
              ? 0
              : Math.min((totalPaid / expectedTotal) * 100, 100)

          const fulfilled = expectedTotal > 0 && totalPaid >= expectedTotal

          // console.log({
          //   name: member.fullName,
          //   year,
          //   totalPaid,
          //   expectedTotal,
          //   percentage,
          //   fulfilled,
          // })

          return { year, fulfilled, percentage }
        })
      }

      const yearsFulfilled = checkInvestmentTransactionsForYears(
        row.original,
        INVESTMENT_YEARS,
      )

      return (
        <div className='flex gap-2 min-w-[400px] flex-wrap'>
          {yearsFulfilled.map(({ year, fulfilled, percentage }, index) => (
            <div key={year} className='relative'>
              <Badge
                variant='outline'
                className={cn(
                  'relative overflow-hidden',
                  fulfilled
                    ? 'text-white '
                    : 'text-gray-500 font-medium border border-primary/50',
                )}
              >
                <span className='relative z-10 flex items-center'>
                  {fulfilled ? (
                    <Check className='mr-1 h-4 w-4' />
                  ) : (
                    <Loader className='mr-1 h-4 w-4' />
                  )}
                  {year}
                </span>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: fulfilled ? '100%' : `${percentage}%`,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.2,
                    ease: 'easeOut',
                  }}
                  style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                >
                  <span
                    className={cn(
                      'block w-full h-full',
                      fulfilled ? 'bg-primary' : 'bg-primary/30',
                    )}
                  />
                </motion.div>
              </Badge>
            </div>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'investment',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total Investment' />
    ),
    cell: ({ row }) => {
      const payments = row.original?.payments

      const investmentPayments = payments?.filter(
        payment => payment.type === 'investment',
      )

      const totalInvestment = investmentPayments?.reduce(
        (total, payment) => total + (payment.amountPaid ?? 0),
        0,
      )

      return (
        <div className='flex space-x-2'>
          <span className='max-w-[500px] truncate'>
            <NumericFormat
              thousandSeparator={true}
              displayType='text'
              prefix={'UGX '}
              value={totalInvestment}
            />
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'benevolent',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total Benevolent' />
    ),
    cell: ({ row }) => {
      const payments = row.original?.payments

      const benevolentPayments = payments?.filter(
        payment => payment.type === 'benovelent',
      )

      const totalBenevolent = benevolentPayments?.reduce(
        (total, payment) => total + (payment.amountPaid ?? 0),
        0,
      )

      return (
        <div className='flex space-x-2'>
          <span className='max-w-[500px] truncate'>
            <NumericFormat
              thousandSeparator={true}
              displayType='text'
              prefix={'UGX '}
              value={totalBenevolent}
            />
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'loan',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total Loan' />
    ),
    cell: ({ row }) => {
      const payments = row.original?.payments

      const loanPayments = payments?.filter(payment => payment.type === 'other')

      const totalLoans = loanPayments?.reduce(
        (total, payment) => total + (payment.amountPaid ?? 0),
        0,
      )
      return (
        <div className='flex space-x-2'>
          <span className='max-w-[500px] truncate'>
            <NumericFormat
              thousandSeparator={true}
              displayType='text'
              prefix={'UGX '}
              value={totalLoans}
            />
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'arrearStatus',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Arrear Status' />
    ),
    cell: ({ row }) => {
      /**
       * Returns true if a member’s investment for the previous month is fully paid.
       *
       * Assumptions:
       * - `member.tierHistory` holds an entry { year, tier: { amount } } for each year.
       * - `member.payments` has transactions with fields { type: 'investment', year, month, amountPaid }.
       * - If there’s no tier entry for that year, we treat the expected amount as 0 (i.e. “no payment due” → paid).
       */
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

      const noArrears = isPreviousMonthPaid(row.original)

      const memberStatus = row.original.status

      const isActive = memberStatus === 'active'

      return (
        <div className='flex w-[100px] items-center'>
          {isActive && noArrears ? (
            <Check className={`mr-2 h-4 w-4 text-green-700`} />
          ) : !isActive ? (
            <CircleX className={`mr-2 h-4 w-4 text-destructive`} />
          ) : (
            <Loader className={`mr-2 h-4 w-4 text-orange-500`} />
          )}
          <span>
            {isActive && noArrears
              ? 'Fully Paid'
              : !isActive
                ? 'Inactive'
                : 'In Arrears'}
          </span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },

  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
