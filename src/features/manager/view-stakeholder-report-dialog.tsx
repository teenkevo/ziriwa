'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export { hasSubmittedEngagementReport } from '@/lib/stakeholder-engagement-report'

interface ViewStakeholderReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stakeholderName: string
  designation?: string
  sectionName?: string
  divisionName?: string
  reportHtml?: string
}

export function ViewStakeholderReportDialog({
  open,
  onOpenChange,
  stakeholderName,
  designation,
  sectionName,
  divisionName,
  reportHtml,
}: ViewStakeholderReportDialogProps) {
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
        <div className='min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/20 p-4'>
          <div
            className='prose prose-sm dark:prose-invert max-w-none [&_ol]:list-decimal [&_ul]:list-disc'
            dangerouslySetInnerHTML={{ __html: reportHtml ?? '' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
