'use client'

import * as React from 'react'
import { FileDown, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import Image from 'next/image'

export interface ContractExportDownloadButtonProps {
  sectionName: string
  financialYearLabel?: string
  objectives?: SsmartaObjective[]
  responsibilityCenter: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function downloadPdfBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function ContractExportDownloadButton(
  props: ContractExportDownloadButtonProps,
) {
  const [isLoading, setIsLoading] = React.useState(false)
  const fileName = `${slugify(props.sectionName)}-${slugify(props.financialYearLabel ?? 'contract')}-contract-export.pdf`

  async function handleExport() {
    setIsLoading(true)

    try {
      const { generateContractExportPdfBlob } = await import(
        './contract-export-pdf'
      )
      const blob = await generateContractExportPdfBlob(props)
      downloadPdfBlob(blob, fileName)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant='outline'
      size='icon'
      disabled={isLoading}
      onClick={handleExport}
    >
      {isLoading ? (
        <Loader2 className='mr-1 h-4 w-4 animate-spin' />
      ) : (
        <Image
          src='/pdf.png'
          alt=''
          width={20}
          height={20}
          className='h-5 w-5 object-contain'
        />
      )}
    </Button>
  )
}
