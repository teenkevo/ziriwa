'use client'

import * as React from 'react'
import {
  Calendar,
  CheckCircle2,
  Download,
  Loader2,
  MoreVertical,
  Pencil,
  ScrollText,
  Trash2,
  Upload,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { cn } from '@/lib/utils'
import { EditMinutesApprovalsDialog } from './edit-minutes-approvals-dialog'
import type {
  StakeholderEntry,
  StakeholderMinutes,
} from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

type StaffOption = { _id: string; fullName?: string; staffId?: string }

interface StakeholderMinutesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: StakeholderEntry | null
  stakeholderIndex: number | null
  engagementId: string
  staffOptions: StaffOption[]
  viewerStaffId?: string
  onSuccess: () => void
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatMinutesDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function downloadMinutesHtml(options: {
  title: string
  authorName?: string
  meetingDate?: string
  content: string
}) {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${options.title}</title>
    <style>
      body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; color: #111; line-height: 1.6; }
      h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
      .meta { color: #666; margin-bottom: 2rem; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <h1>${options.title}</h1>
    <p class="meta">${[options.authorName, options.meetingDate].filter(Boolean).join(' · ')}</p>
    ${options.content}
  </body>
</html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${options.title.replace(/\s+/g, '-').toLowerCase()}.html`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function StakeholderMinutesDialog({
  open,
  onOpenChange,
  entry,
  stakeholderIndex,
  engagementId,
  staffOptions,
  viewerStaffId,
  onSuccess,
}: StakeholderMinutesDialogProps) {
  const [content, setContent] = React.useState('')
  const [minutes, setMinutes] = React.useState<StakeholderMinutes | undefined>()
  const [isSaving, setIsSaving] = React.useState(false)
  const [approvalsOpen, setApprovalsOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open || !entry) return
    setMinutes(entry.minutes)
    setContent(entry.minutes?.content ?? '')
  }, [open, entry])

  const isPublished = minutes?.status === 'published'
  const isReadOnly = isPublished
  const title = entry
    ? `Minutes for engagement with ${entry.name}${entry.designation ? ` (${entry.designation})` : ''}`
    : 'Meeting minutes'
  const authorName =
    minutes?.author?.fullName ??
    staffOptions.find(staff => staff._id === viewerStaffId)?.fullName ??
    'Author'
  const meetingDate =
    minutes?.meetingDate ?? entry?.proposedDateOfEngagement ?? undefined
  const pendingApproval = (minutes?.approvals ?? []).find(
    approval =>
      approval.assignee?._id === viewerStaffId &&
      approval.status !== 'approved',
  )
  const allApprovalsComplete =
    (minutes?.approvals?.length ?? 0) === 0 ||
    (minutes?.approvals ?? []).every(approval => approval.status === 'approved')
  const hasContent = Boolean(stripHtml(content))

  async function patchMinutes(op: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/stakeholder-engagement/${engagementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, payload }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Request failed')
    }
  }

  async function handleSaveDraft() {
    if (stakeholderIndex === null || isReadOnly) return
    setIsSaving(true)
    try {
      await patchMinutes('saveMinutes', {
        stakeholderIndex,
        content,
        authorId: minutes?.author?._id ?? viewerStaffId,
        meetingDate,
      })
      onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save minutes')
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePublish() {
    if (stakeholderIndex === null || isReadOnly) return
    if (!stripHtml(content)) {
      alert('Write minutes before publishing')
      return
    }
    setIsSaving(true)
    try {
      await patchMinutes('publishMinutes', {
        stakeholderIndex,
        content,
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to publish minutes',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleApprove() {
    if (stakeholderIndex === null || !viewerStaffId) return
    setIsSaving(true)
    try {
      await patchMinutes('approveMinutes', {
        stakeholderIndex,
        assigneeId: viewerStaffId,
      })
      onSuccess()
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to approve minutes',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveApprovals(approverIds: string[]) {
    if (stakeholderIndex === null) return
    setIsSaving(true)
    try {
      if (!minutes && stripHtml(content)) {
        await patchMinutes('saveMinutes', {
          stakeholderIndex,
          content,
          authorId: viewerStaffId,
          meetingDate,
        })
      }
      await patchMinutes('setMinutesApprovals', {
        stakeholderIndex,
        approverIds,
      })
      setApprovalsOpen(false)
      onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save approvals')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteMinutes() {
    if (stakeholderIndex === null) return
    setIsSaving(true)
    try {
      await patchMinutes('deleteMinutes', { stakeholderIndex })
      setDeleteOpen(false)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete minutes')
    } finally {
      setIsSaving(false)
    }
  }

  function handleDownload() {
    if (!stripHtml(content)) {
      alert('No minutes content to download')
      return
    }
    downloadMinutesHtml({
      title,
      authorName,
      meetingDate: formatMinutesDate(meetingDate),
      content,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          disableClose={isSaving}
          className={cn(
            'flex flex-col gap-0 overflow-hidden rounded-xl p-0',
            '!fixed !inset-3 !bottom-3 !left-3 !right-3 !top-3',
            '!h-auto !max-h-none !w-auto !max-w-none',
            '!translate-x-0 !translate-y-0',
            'sm:!inset-4',
            '[&>button.absolute]:hidden',
          )}
        >
          <div className='flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6'>
            <div className='min-w-0'>
              <DialogTitle className='truncate text-left text-base sm:text-md'>
                {title}
              </DialogTitle>
              <DialogDescription className='text-left'>
                {isPublished
                  ? 'Published meeting minutes'
                  : 'Draft meeting minutes'}
              </DialogDescription>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              {pendingApproval ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleApprove}
                  disabled={isSaving}
                >
                  <CheckCircle2 className='mr-2 h-4 w-4' />
                  Approve minutes
                </Button>
              ) : null}
              {!isPublished ? (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleSaveDraft}
                    disabled={isSaving || !hasContent}
                  >
                    Save draft
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    onClick={handlePublish}
                    disabled={isSaving || !hasContent || !allApprovalsComplete}
                    title={
                      !hasContent
                        ? 'Write minutes before publishing'
                        : allApprovalsComplete
                          ? 'Publish minutes'
                          : 'All assigned approvers must approve before publishing'
                    }
                  >
                    <Upload className='mr-2 h-4 w-4' />
                    Publish minutes
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className='flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3 sm:px-6'>
            <div className='flex flex-wrap items-center gap-2 text-sm'>
              <Badge variant='secondary' className='rounded-full px-3 py-1'>
                {authorName}
              </Badge>
              <span className='text-muted-foreground'>on</span>
              <span className='inline-flex items-center gap-1 text-muted-foreground'>
                <Calendar className='h-4 w-4' />
                {formatMinutesDate(meetingDate)}
              </span>
              {minutes?.status ? (
                <Badge
                  variant={isPublished ? 'default' : 'outline'}
                  className='rounded-full'
                >
                  {isPublished ? 'Published' : 'Draft'}
                </Badge>
              ) : null}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground'
                >
                  <MoreVertical className='h-4 w-4' />
                  <span className='sr-only'>Minutes options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-52'>
                {!isPublished ? (
                  <DropdownMenuItem
                    disabled={!hasContent}
                    onClick={() => setApprovalsOpen(true)}
                  >
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit approval details
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem disabled={!hasContent} onClick={handleDownload}>
                  <Download className='mr-2 h-4 w-4' />
                  Download
                </DropdownMenuItem>
                {minutes ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className='text-destructive focus:text-destructive'
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete minutes
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {(minutes?.approvals?.length ?? 0) > 0 ? (
            <div className='border-b px-4 py-3 sm:px-6'>
              <p className='mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Approvals
              </p>
              <div className='flex flex-wrap gap-2'>
                {minutes?.approvals?.map(approval => (
                  <Badge
                    key={approval._key}
                    variant={
                      approval.status === 'approved' ? 'secondary' : 'outline'
                    }
                  >
                    {approval.assignee?.fullName ?? 'Approver'}
                    {' · '}
                    {approval.status === 'approved' ? 'Approved' : 'Pending'}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6'>
            {isReadOnly ? (
              <div className='rounded-md border bg-background p-4'>
                {stripHtml(content) ? (
                  <div
                    className='prose prose-sm dark:prose-invert max-w-none [&_ol]:list-decimal [&_ul]:list-disc'
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    No minutes content.
                  </p>
                )}
              </div>
            ) : (
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder='Write the meeting minutes here...'
                minHeight='min(100%, 520px)'
                className='h-full min-h-[420px]'
              />
            )}
          </div>

          {!minutes && !stripHtml(content) ? (
            <div className='border-t px-4 py-3 text-sm text-muted-foreground sm:px-6'>
              <ScrollText className='mr-2 inline h-4 w-4' />
              Start typing to create minutes for this engagement.
            </div>
          ) : null}

          <DialogFooter className='border-t px-4 py-3 sm:justify-end sm:px-6'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditMinutesApprovalsDialog
        open={approvalsOpen}
        onOpenChange={setApprovalsOpen}
        minutes={minutes}
        staffOptions={staffOptions}
        isSaving={isSaving}
        onSave={handleSaveApprovals}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent disableClose={isSaving}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete minutes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the minutes for this stakeholder
              engagement. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                handleDeleteMinutes()
              }}
              disabled={isSaving}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isSaving ? 'Deleting...' : 'Delete minutes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
