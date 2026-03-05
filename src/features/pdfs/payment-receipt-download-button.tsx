import React, { useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import PaymentReceipt from './payment-receipt'
import { MEMBER_BY_ID_QUERYResult } from '../../../sanity.types'
import { FileTextIcon } from 'lucide-react'
import { getMonthName } from '@/lib/utils'
import Image from 'next/image'

const PaymentReceiptDownloadButton = ({
  payment,
  member,
}: {
  payment: MEMBER_BY_ID_QUERYResult[number]['payments'][number]
  member: MEMBER_BY_ID_QUERYResult[number]
}) => {
  const handleClick = useCallback(async () => {
    // Generate the PDF document only when the button is clicked
    const documentNode = <PaymentReceipt payment={payment} member={member} />
    const blob = await pdf(documentNode).toBlob()
    const fileName = `RECEIPT-${getMonthName(
      payment.month || 0,
    ).toUpperCase()}-${payment.year}-${payment._id.toUpperCase()}.pdf`

    // Create a temporary link to trigger download
    const blobURL = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobURL
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(blobURL)
  }, [payment, member])

  return (
    <button
      onClick={handleClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <Image
        src='/pdf.png'
        alt='Download PDF'
        width={16}
        height={16}
        className='h-6 w-6'
      />
    </button>
  )
}

export default PaymentReceiptDownloadButton
