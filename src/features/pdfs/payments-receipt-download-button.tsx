import React, { useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import PaymentReceipt from './payment-receipt'
import { MEMBER_BY_ID_QUERYResult } from '../../../sanity.types'
import { FileTextIcon } from 'lucide-react'
import { getMonthName } from '@/lib/utils'
import Image from 'next/image'
import PaymentsReceipt from './payments-receipt'
import { Button } from '@/components/ui/button'

const PaymentsReceiptDownloadButton = ({
  payments,
  member,
  btnText,
  year,
}: {
  payments: MEMBER_BY_ID_QUERYResult[number]['payments']
  member: MEMBER_BY_ID_QUERYResult[number]
  btnText: string
  year: string
}) => {
  const handleClick = useCallback(async () => {
    // Generate the PDF document only when the button is clicked
    const documentNode = (
      <PaymentsReceipt payments={payments} member={member} year={year} />
    )
    const blob = await pdf(documentNode).toBlob()
    const fileName = `RECEIPTS-${btnText}-${member.memberId}.pdf`

    // Create a temporary link to trigger download
    const blobURL = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobURL
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(blobURL)
  }, [payments, member])

  return (
    <Button variant='secondary' onClick={handleClick}>
      <Image
        src='/pdf.png'
        alt='Download PDF'
        width={16}
        height={16}
        className='h-6 w-6'
      />
      <span className='text-xs'>Download {btnText} Statement</span>
    </Button>
  )
}

export default PaymentsReceiptDownloadButton
