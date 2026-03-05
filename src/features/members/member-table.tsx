import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { NumericFormat } from 'react-number-format'
import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { MEMBER_BY_ID_QUERYResult } from '../../../sanity.types'
import PaymentReceiptDownloadButton from '../pdfs/payment-receipt-download-button'
import PaymentsReceiptDownloadButton from '../pdfs/payments-receipt-download-button'

export function MemberTable({
  member,
  category,
}: {
  member: MEMBER_BY_ID_QUERYResult[number]
  category: string
}) {
  const [selectedYear, setSelectedYear] = useState<string>('all')

  // Extract unique years and sort them ascending for the Tabs
  const uniqueYears = Array.from(
    new Set(member?.payments?.map(t => t?.year?.toString()) || []),
  )
    .filter(y => y !== '')
    .sort((a, b) => Number(a) - Number(b))

  // 1. Filter by category and selectedYear
  // 2. Sort the filtered array by paymentDate descending (latest first)
  const filteredPayments = member?.payments
    ?.filter(
      payment =>
        payment.type === category &&
        (selectedYear === 'all'
          ? true
          : payment.year?.toString() === selectedYear),
    )
    .sort((a, b) => {
      // Push entries with missing dates to the bottom
      if (!a.paymentDate) return 1
      if (!b.paymentDate) return -1

      // Compare timestamps for descending order (latest first)
      return (
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )
    })

  const totalInvestment =
    filteredPayments?.reduce(
      (total, payment) => total + (payment.amountPaid ?? 0),
      0,
    ) || 0

  const btnText =
    selectedYear === 'all' ? 'All Investments' : `${selectedYear} Investment`

  return (
    <div className='space-y-4'>
      <Tabs
        defaultValue='all'
        value={selectedYear}
        onValueChange={setSelectedYear}
      >
        <TabsList>
          <TabsTrigger value='all'>All Years</TabsTrigger>
          {uniqueYears.map(year => (
            <TabsTrigger key={year} value={year || ''}>
              {year}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <PaymentsReceiptDownloadButton
        payments={filteredPayments}
        member={member}
        btnText={btnText}
        year={selectedYear}
      />

      <div className='rounded-md border'>
        <div className='md:hidden text-xs text-muted-foreground p-2 text-center flex items-center justify-center gap-2 border-b'>
          <AlertCircle className='h-4 w-4 text-green-600' />
          Scroll horizontally to view all columns
        </div>
        <Table>
          <TableHeader className='bg-muted/50'>
            <TableRow>
              <TableHead className='min-w-[120px] md:min-w-[120px] sticky left-0 max-md:bg-muted/80 max-md:backdrop-blur-sm'>
                Transaction ID
              </TableHead>
              <TableHead className='min-w-[150px] md:min-w-[150px]'>
                Transaction Date
              </TableHead>
              <TableHead>Year</TableHead>
              <TableHead className='min-w-[150px] md:min-w-[150px]'>
                Payment Method
              </TableHead>
              <TableHead className='min-w-[200px] md:min-w-[180px]'>
                Description
              </TableHead>
              <TableHead className='text-right min-w-[200px] md:min-w-[180px]'>
                Amount
              </TableHead>
              <TableHead className='text-right'>Download Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments?.map(payment => (
              <TableRow key={payment._id}>
                <TableCell className='font-medium sticky left-0 max-md:bg-muted/80 max-md:backdrop-blur-sm'>
                  TRX-{payment._id.slice(12)}
                </TableCell>
                <TableCell>
                  {payment.paymentDate
                    ? format(
                        new Date(payment.paymentDate),
                        'MMM d, yyyy, h:mm a',
                      )
                    : 'N/A'}
                </TableCell>
                <TableCell>{payment.year}</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>{payment.description}</TableCell>
                <TableCell className='text-right'>
                  <NumericFormat
                    thousandSeparator={true}
                    displayType='text'
                    prefix={'UGX '}
                    value={payment.amountPaid ?? 0}
                  />
                </TableCell>
                <TableCell className='text-right'>
                  <PaymentReceiptDownloadButton
                    payment={payment}
                    member={member}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>Total</TableCell>
              <TableCell className='text-right'>
                <NumericFormat
                  thousandSeparator={true}
                  displayType='text'
                  prefix={'UGX '}
                  value={totalInvestment}
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
