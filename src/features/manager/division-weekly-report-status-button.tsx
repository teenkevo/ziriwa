'use client'

import * as React from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type { DivisionWeeklyReportSection } from '@/features/sections/components/weekly-report-pdf'

export type DivisionWeeklyReportPayload = {
  divisionName: string
  weekLabel: string
  sections: DivisionWeeklyReportSection[]
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function DivisionWeeklyReportStatusButton({
  weeklyReport,
}: {
  weeklyReport: DivisionWeeklyReportPayload
}) {
  const [isGenerating, setIsGenerating] = React.useState(false)

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    event.preventDefault()

    if (isGenerating) return

    setIsGenerating(true)
    try {
      const { generateDivisionWeeklyReportBlob, divisionWeeklyReportFileName } =
        await import('@/features/sections/components/weekly-report-pdf')

      const blob = await generateDivisionWeeklyReportBlob({
        divisionName: weeklyReport.divisionName,
        weekLabel: weeklyReport.weekLabel,
        sections: weeklyReport.sections,
      })

      downloadBlob(
        blob,
        divisionWeeklyReportFileName(
          weeklyReport.divisionName,
          weeklyReport.weekLabel,
        ),
      )
    } catch (error) {
      console.error('Failed to generate division weekly report', error)
      toast.error('Could not generate the weekly report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={isGenerating}
      className='h-6 w-full px-2 text-[10px] font-medium border-primary'
      onClick={handleClick}
      onPointerDown={event => event.stopPropagation()}
    >
      {isGenerating ? (
        <>
          <Loader2 className='h-3 w-3 shrink-0 animate-spin' />
          Preparing…
        </>
      ) : (
        <>
          <Download className='h-3 w-3 shrink-0' aria-hidden />
          Report
        </>
      )}
    </Button>
  )
}
