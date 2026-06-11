'use client'

import * as React from 'react'
import Image from 'next/image'
import { Download, Eye, Loader2, Trash2, Upload } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import type {
  StakeholderEntry,
  StakeholderFileAsset,
} from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

interface SubmitReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: StakeholderEntry | null
  stakeholderIndex: number | null
  engagementId: string
  onSuccess: () => void
}

function AttendanceSheetPreview({
  filename,
  url,
  onRemove,
  disabled,
}: {
  filename: string
  url?: string
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div className='flex items-center gap-3 rounded-md border bg-muted/30 p-3'>
      <Image
        src='/pdf.png'
        alt=''
        width={36}
        height={36}
        className='shrink-0 rounded'
      />
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{filename}</p>
        <p className='text-xs text-muted-foreground'>Attendance sheet (PDF)</p>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        {url ? (
          <>
            <Button type='button' variant='outline' size='icon' className='h-8 w-8' asChild>
              <a
                href={url}
                target='_blank'
                rel='noopener noreferrer'
                aria-label='View attendance sheet'
              >
                <Eye className='h-4 w-4' />
              </a>
            </Button>
            <Button type='button' variant='outline' size='icon' className='h-8 w-8' asChild>
              <a href={url} download aria-label='Download attendance sheet'>
                <Download className='h-4 w-4' />
              </a>
            </Button>
          </>
        ) : null}
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='h-8 w-8'
          onClick={onRemove}
          disabled={disabled}
          aria-label='Remove attendance sheet'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

export function SubmitReportDialog({
  open,
  onOpenChange,
  entry,
  stakeholderIndex,
  engagementId,
  onSuccess,
}: SubmitReportDialogProps) {
  const [report, setReport] = React.useState('')
  const [existingAsset, setExistingAsset] =
    React.useState<StakeholderFileAsset | null>(null)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [removeAttendanceSheet, setRemoveAttendanceSheet] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open && entry) {
      setReport(entry.engagementReport ?? '')
      setExistingAsset(entry.attendanceSheet?.asset ?? null)
      setPendingFile(null)
      setRemoveAttendanceSheet(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open, entry])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are accepted for the attendance sheet')
      e.target.value = ''
      return
    }
    setPendingFile(file)
    setRemoveAttendanceSheet(false)
  }

  const handleRemoveAttendanceSheet = () => {
    setPendingFile(null)
    setRemoveAttendanceSheet(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (stakeholderIndex === null) return
    setIsSubmitting(true)
    try {
      let attendanceSheetFileId: string | undefined
      if (pendingFile) {
        const formData = new FormData()
        formData.append('file', pendingFile)
        const uploadRes = await fetch('/api/sanity/upload', {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}))
          throw new Error(
            (data as { error?: string }).error ?? 'Failed to upload attendance sheet',
          )
        }
        const uploadData = (await uploadRes.json()) as { id: string }
        attendanceSheetFileId = uploadData.id
      }

      const res = await fetch(`/api/stakeholder-engagement/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'updateReport',
          payload: {
            stakeholderIndex,
            engagementReport: report,
            ...(attendanceSheetFileId
              ? { attendanceSheetFileId }
              : removeAttendanceSheet
                ? { clearAttendanceSheet: true }
                : {}),
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save report')
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showExistingSheet =
    existingAsset && !removeAttendanceSheet && !pendingFile

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableClose={isSubmitting}
        className='flex max-h-[90vh] max-w-2xl flex-col'
      >
        <DialogHeader>
          <DialogTitle>Submit Engagement Report</DialogTitle>
          <DialogDescription>
            {entry
              ? `Report for ${entry.name}${entry.designation ? ` (${entry.designation})` : ''}`
              : 'Write your stakeholder engagement report.'}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto'>
          <div className='space-y-2'>
            <Label>Engagement report</Label>
            <RichTextEditor
              value={report}
              onChange={setReport}
              placeholder='Describe the engagement outcomes, key points discussed, follow-up actions, and any other relevant details...'
              minHeight='240px'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='attendance-sheet-upload'>Attendance sheet (PDF)</Label>
            {pendingFile ? (
              <AttendanceSheetPreview
                filename={pendingFile.name}
                onRemove={handleRemoveAttendanceSheet}
                disabled={isSubmitting}
              />
            ) : showExistingSheet ? (
              <AttendanceSheetPreview
                filename={existingAsset.originalFilename ?? 'attendance-sheet.pdf'}
                url={existingAsset.url}
                onRemove={handleRemoveAttendanceSheet}
                disabled={isSubmitting}
              />
            ) : (
              <div className='rounded-md border border-dashed p-4'>
                <input
                  ref={fileInputRef}
                  id='attendance-sheet-upload'
                  type='file'
                  accept='application/pdf,.pdf'
                  className='sr-only'
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  <Upload className='mr-2 h-4 w-4' />
                  Upload attendance sheet
                </Button>
                <p className='mt-2 text-xs text-muted-foreground'>
                  Optional. PDF only.
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Saving...
              </>
            ) : (
              'Save Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
