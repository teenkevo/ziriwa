'use client'

import Image from 'next/image'
import { Download, Eye } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { StakeholderFileAsset } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

export { hasSubmittedEngagementReport } from '@/lib/stakeholder-engagement-report'

interface ViewStakeholderReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stakeholderName: string
  designation?: string
  sectionName?: string
  divisionName?: string
  reportHtml?: string
  attendanceSheet?: { asset?: StakeholderFileAsset }
}

export function ViewStakeholderReportDialog({
  open,
  onOpenChange,
  stakeholderName,
  designation,
  sectionName,
  divisionName,
  reportHtml,
  attendanceSheet,
}: ViewStakeholderReportDialogProps) {
  const attendanceAsset = attendanceSheet?.asset
  const contextParts = [
    divisionName,
    sectionName,
    designation,
  ].filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] max-w-2xl flex-col'>
        <DialogHeader>
          <DialogTitle>Engagement report</DialogTitle>
          <DialogDescription>
            {stakeholderName}
            {contextParts.length > 0 ? ` · ${contextParts.join(' · ')}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto'>
          {attendanceAsset?.url ? (
            <div className='flex items-center gap-3 rounded-md border bg-muted/30 p-3'>
              <Image
                src='/pdf.png'
                alt=''
                width={36}
                height={36}
                className='shrink-0 rounded'
              />
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium'>Attendance sheet</p>
                <p className='truncate text-xs text-muted-foreground'>
                  {attendanceAsset.originalFilename ?? 'attendance-sheet.pdf'}
                </p>
              </div>
              <div className='flex shrink-0 items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  asChild
                >
                  <a
                    href={attendanceAsset.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label='View attendance sheet'
                  >
                    <Eye className='h-4 w-4' />
                  </a>
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  asChild
                >
                  <a
                    href={attendanceAsset.url}
                    download
                    aria-label='Download attendance sheet'
                  >
                    <Download className='h-4 w-4' />
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
          <div className='rounded-md border bg-muted/20 p-4'>
            <div
              className='prose prose-sm dark:prose-invert max-w-none [&_ol]:list-decimal [&_ul]:list-disc'
              dangerouslySetInnerHTML={{ __html: reportHtml ?? '' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
