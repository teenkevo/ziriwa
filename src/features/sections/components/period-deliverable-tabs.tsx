'use client'

import * as React from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  ChevronDown,
  Download,
  Eye,
  Loader2,
  Paperclip,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  PeriodDeliverable,
  PeriodDeliverableItem,
  PeriodDeliverableReviewEntry,
} from './detailed-tasks-table'

interface PeriodDeliverableTabsProps {
  periodKey: string
  pd: PeriodDeliverable
  onAddDeliverable: (tag: 'support' | 'main') => void
  onRemoveDeliverable?: (key: string) => void
  onSubmitForReview?: () => void
  onApproveDeliverable?: (reason?: string) => void
  onRejectDeliverable?: (message: string) => void
  onRespondToDeliverableRejection?: (
    message: string,
    replacementFile?: File,
  ) => Promise<void>
  isSaving: boolean
  uploadingTag?: 'support' | 'main' | null
  deliverablesLocked?: boolean
}

export function PeriodDeliverableTabs({
  periodKey,
  pd,
  onAddDeliverable,
  onRemoveDeliverable,
  onSubmitForReview,
  onApproveDeliverable,
  onRejectDeliverable,
  onRespondToDeliverableRejection,
  isSaving,
  uploadingTag = null,
  deliverablesLocked = false,
}: PeriodDeliverableTabsProps) {
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false)
  const [approveReason, setApproveReason] = React.useState('')
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectMessage, setRejectMessage] = React.useState('')
  const [resubmitDialogOpen, setResubmitDialogOpen] = React.useState(false)
  const [resubmitFile, setResubmitFile] = React.useState<File | null>(null)
  const [resubmitComment, setResubmitComment] = React.useState('')
  const [resubmitting, setResubmitting] = React.useState(false)
  const resubmitFileRef = React.useRef<HTMLInputElement>(null)

  const deliverable = pd.deliverable ?? []
  const thread = pd.deliverableReviewThread ?? []
  const periodStatus = pd.status ?? 'pending'
  const mainDeliverable = deliverable.find(
    (e: PeriodDeliverableItem) => (e.tag ?? 'support') === 'main',
  )
  const mainFile = mainDeliverable?.file?.asset
  const submitEntry = thread.find(
    (e: PeriodDeliverableReviewEntry) =>
      e.action === 'submit' && e.role === 'officer',
  )
  const submitDateStr = submitEntry?.createdAt
    ? format(new Date(submitEntry.createdAt), 'MMM d, yyyy, h:mm a')
    : ''
  const lastIdx = thread.length - 1
  const isDone = periodStatus === 'done'
  const needsOfficerResubmit =
    !isDone &&
    lastIdx >= 0 &&
    thread[lastIdx]?.action === 'reject' &&
    thread[lastIdx]?.role === 'supervisor'
  const isPendingRejection = (i: number) =>
    needsOfficerResubmit && i === lastIdx
  const subsequentEntries = thread.filter(
    (e: PeriodDeliverableReviewEntry) =>
      !(e.action === 'submit' && e.role === 'officer'),
  )

  const handleResubmit = async () => {
    if (!onRespondToDeliverableRejection) return
    if (!resubmitFile) {
      toast.error('Please select a file')
      return
    }
    setResubmitting(true)
    try {
      await onRespondToDeliverableRejection(
        resubmitComment.trim(),
        resubmitFile,
      )
      setResubmitFile(null)
      setResubmitComment('')
      resubmitFileRef.current && (resubmitFileRef.current.value = '')
      setResubmitDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resubmit failed')
    } finally {
      setResubmitting(false)
    }
  }

  return (
    <Tabs defaultValue='main' className='w-full'>
      <TabsList className='w-full grid grid-cols-2'>
        <TabsTrigger value='main' className='text-xs'>
          Main
        </TabsTrigger>
        <TabsTrigger value='supporting' className='text-xs'>
          Supporting
        </TabsTrigger>
      </TabsList>
      <TabsContent value='supporting' className='space-y-2 mt-2'>
        {deliverable
          .filter(
            (e: PeriodDeliverableItem) => (e.tag ?? 'support') === 'support',
          )
          .map((item: PeriodDeliverableItem) => {
            const asset = item.file?.asset
            if (!asset?.url) return null
            return (
              <div
                key={item._key ?? asset._id}
                className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'
              >
                <Image
                  src='/pdf.png'
                  alt='PDF'
                  width={36}
                  height={36}
                  className='shrink-0 rounded'
                />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>
                    {asset.originalFilename ?? 'document.pdf'}
                  </p>
                </div>
                <div className='flex items-center gap-1 shrink-0'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    asChild
                  >
                    <a
                      href={asset.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center justify-center'
                      aria-label='View'
                    >
                      <Eye className='h-4 w-4' />
                    </a>
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    asChild
                  >
                    <a
                      href={asset.url}
                      download
                      className='flex items-center justify-center'
                      aria-label='Download'
                    >
                      <Download className='h-4 w-4' />
                    </a>
                  </Button>
                  {onRemoveDeliverable && item._key && (
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='h-7 w-7'
                      onClick={() => onRemoveDeliverable(item._key!)}
                      disabled={isSaving || item.locked}
                      aria-label='Remove'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onAddDeliverable('support')}
          disabled={isSaving || uploadingTag !== null || deliverablesLocked}
        >
          {uploadingTag === 'support' ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Paperclip className='h-4 w-4' />
          )}
          <span className='ml-2'>Add Supporting Deliverable</span>
        </Button>
      </TabsContent>
      <TabsContent value='main' className='space-y-2 mt-2'>
        {(periodStatus === 'in_review' || periodStatus === 'done') &&
          deliverable.some(
            (e: PeriodDeliverableItem) =>
              (e.tag ?? 'support') === 'main' && e.locked,
          ) &&
          (isDone ? (
            <div className='space-y-2'>
              {mainFile?.url && (
                <div className='space-y-2'>
                  <p className='text-xs text-muted-foreground'>
                    Main deliverable approved by Supervisor
                  </p>
                  <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                    <Image
                      src='/pdf.png'
                      alt='PDF'
                      width={36}
                      height={36}
                      className='shrink-0 rounded'
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium truncate'>
                        {mainFile.originalFilename ?? 'document.pdf'}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Approved by Supervisor
                      </p>
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='h-7 w-7'
                        asChild
                      >
                        <a
                          href={mainFile.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center justify-center'
                          aria-label='View'
                        >
                          <Eye className='h-4 w-4' />
                        </a>
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='h-7 w-7'
                        asChild
                      >
                        <a
                          href={mainFile.url}
                          download
                          className='flex items-center justify-center'
                          aria-label='Download'
                        >
                          <Download className='h-4 w-4' />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <Accordion type='single' collapsible>
                <AccordionItem
                  value='period-deliverable-review'
                  className='border rounded-md'
                >
                  <AccordionTrigger className='px-3 py-2 bg-muted/80 text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180'>
                    <span className='font-light'>
                      Click to see approval thread
                    </span>
                    <ChevronDown className='h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200' />
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='border-t divide-y max-h-[180px] overflow-y-auto'>
                      {[...subsequentEntries]
                        .reverse()
                        .map(
                          (entry: PeriodDeliverableReviewEntry, i: number) => {
                            const origIdx = thread.indexOf(entry)
                            const fileToShow = entry.file?.asset
                            const role =
                              (entry.role ?? 'Officer') === 'supervisor'
                                ? 'Supervisor'
                                : 'Officer'
                            const actionLabel: Record<string, string> = {
                              submit: 'Submitted for review',
                              approve: 'Approved',
                              reject: 'Rejected',
                              respond: 'Resubmitted',
                            }
                            const action =
                              actionLabel[entry.action ?? ''] ??
                              (entry.action ?? '').replace(/^./, (c: string) =>
                                c.toUpperCase(),
                              )
                            const dateStr = entry.createdAt
                              ? format(
                                  new Date(entry.createdAt),
                                  'MMM d, yyyy, h:mm a',
                                )
                              : ''
                            const titleStr = `${role} ${action}${dateStr ? ` – ${dateStr}` : ''}`
                            return (
                              <div
                                key={entry._key ?? origIdx}
                                className='p-2.5 space-y-2'
                              >
                                <p className='text-xs text-muted-foreground'>
                                  {titleStr}
                                </p>
                                {(entry.action === 'submit' ||
                                  entry.action === 'respond') &&
                                  fileToShow?.url && (
                                    <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                                      <Image
                                        src='/pdf.png'
                                        alt='PDF'
                                        width={36}
                                        height={36}
                                        className='shrink-0 rounded'
                                      />
                                      <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-medium truncate'>
                                          {fileToShow.originalFilename ??
                                            'document.pdf'}
                                        </p>
                                      </div>
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        className='h-7 w-7'
                                        asChild
                                      >
                                        <a
                                          href={fileToShow.url}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                          className='flex items-center justify-center'
                                          aria-label='View'
                                        >
                                          <Eye className='h-4 w-4' />
                                        </a>
                                      </Button>
                                    </div>
                                  )}
                                {entry.message && (
                                  <p className='text-sm text-foreground'>
                                    {entry.message}
                                  </p>
                                )}
                                {isPendingRejection(origIdx) &&
                                  onRespondToDeliverableRejection && (
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      onClick={() =>
                                        setResubmitDialogOpen(true)
                                      }
                                      disabled={isSaving}
                                    >
                                      <Paperclip className='h-4 w-4' />
                                      <span className='ml-1.5'>
                                        Resubmit main deliverable
                                      </span>
                                    </Button>
                                  )}
                                {!needsOfficerResubmit &&
                                  subsequentEntries.length > 0 &&
                                  i === 0 &&
                                  entry.action === 'respond' &&
                                  onApproveDeliverable &&
                                  onRejectDeliverable && (
                                    <div className='flex flex-wrap gap-2 pt-1'>
                                      <Dialog
                                        open={approveDialogOpen}
                                        onOpenChange={setApproveDialogOpen}
                                      >
                                        <DialogTrigger asChild>
                                          <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            disabled={isSaving}
                                          >
                                            <ThumbsUp className='h-4 w-4' />
                                            <span className='ml-1.5'>
                                              Approve
                                            </span>
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>
                                              Approve deliverable
                                            </DialogTitle>
                                            <DialogDescription>
                                              Approval will mark this period as
                                              Done.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className='py-4'>
                                            <Label className='text-xs'>
                                              Reason (optional)
                                            </Label>
                                            <textarea
                                              value={approveReason}
                                              onChange={e =>
                                                setApproveReason(e.target.value)
                                              }
                                              disabled={isSaving}
                                              className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                              placeholder='Add an optional note...'
                                            />
                                          </div>
                                          <DialogFooter>
                                            <Button
                                              variant='outline'
                                              onClick={() =>
                                                setApproveDialogOpen(false)
                                              }
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                onApproveDeliverable(
                                                  approveReason.trim() ||
                                                    undefined,
                                                )
                                                setApproveDialogOpen(false)
                                                setApproveReason('')
                                              }}
                                            >
                                              Approve
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                      <Dialog
                                        open={rejectDialogOpen}
                                        onOpenChange={setRejectDialogOpen}
                                      >
                                        <DialogTrigger asChild>
                                          <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            disabled={isSaving}
                                          >
                                            <ThumbsDown className='h-4 w-4' />
                                            <span className='ml-1.5'>
                                              Reject
                                            </span>
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>
                                              Reject deliverable
                                            </DialogTitle>
                                            <DialogDescription>
                                              The officer will be able to
                                              resubmit a replacement for the
                                              main deliverable.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className='py-4'>
                                            <Label className='text-xs' required>
                                              Reason
                                            </Label>
                                            <textarea
                                              value={rejectMessage}
                                              onChange={e =>
                                                setRejectMessage(e.target.value)
                                              }
                                              disabled={isSaving}
                                              className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                              placeholder='Explain what needs to be changed...'
                                            />
                                          </div>
                                          <DialogFooter>
                                            <Button
                                              variant='outline'
                                              onClick={() =>
                                                setRejectDialogOpen(false)
                                              }
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                if (!rejectMessage.trim()) {
                                                  toast.error(
                                                    'Please provide a reason for rejection',
                                                  )
                                                  return
                                                }
                                                onRejectDeliverable(
                                                  rejectMessage.trim(),
                                                )
                                                setRejectDialogOpen(false)
                                                setRejectMessage('')
                                              }}
                                              disabled={!rejectMessage.trim()}
                                            >
                                              Reject
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  )}
                              </div>
                            )
                          },
                        )}
                      <div className='p-2.5 space-y-2'>
                        <p className='text-xs text-muted-foreground'>
                          Officer submitted main deliverable
                          {submitDateStr ? ` – ${submitDateStr}` : ''}
                        </p>
                        {mainFile?.url && (
                          <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                            <Image
                              src='/pdf.png'
                              alt='PDF'
                              width={36}
                              height={36}
                              className='shrink-0 rounded'
                            />
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-medium truncate'>
                                {mainFile.originalFilename ?? 'document.pdf'}
                              </p>
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='h-7 w-7'
                              asChild
                            >
                              <a
                                href={mainFile.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center justify-center'
                                aria-label='View'
                              >
                                <Eye className='h-4 w-4' />
                              </a>
                            </Button>
                          </div>
                        )}
                        {!needsOfficerResubmit &&
                          subsequentEntries.length === 0 &&
                          onApproveDeliverable &&
                          onRejectDeliverable && (
                            <div className='flex flex-wrap gap-2 pt-1'>
                              <Dialog
                                open={approveDialogOpen}
                                onOpenChange={setApproveDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={isSaving}
                                  >
                                    <ThumbsUp className='h-4 w-4' />
                                    <span className='ml-1.5'>Approve</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Approve deliverable
                                    </DialogTitle>
                                    <DialogDescription>
                                      Approval will mark this period as Done.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className='py-4'>
                                    <Label className='text-xs'>
                                      Reason (optional)
                                    </Label>
                                    <textarea
                                      value={approveReason}
                                      onChange={e =>
                                        setApproveReason(e.target.value)
                                      }
                                      disabled={isSaving}
                                      className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                      placeholder='Add an optional note...'
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant='outline'
                                      onClick={() =>
                                        setApproveDialogOpen(false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        onApproveDeliverable(
                                          approveReason.trim() || undefined,
                                        )
                                        setApproveDialogOpen(false)
                                        setApproveReason('')
                                      }}
                                    >
                                      Approve
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Dialog
                                open={rejectDialogOpen}
                                onOpenChange={setRejectDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={isSaving}
                                  >
                                    <ThumbsDown className='h-4 w-4' />
                                    <span className='ml-1.5'>Reject</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Reject deliverable
                                    </DialogTitle>
                                    <DialogDescription>
                                      The officer will be able to resubmit a
                                      replacement for the main deliverable.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className='py-4'>
                                    <Label className='text-xs' required>
                                      Reason
                                    </Label>
                                    <textarea
                                      value={rejectMessage}
                                      onChange={e =>
                                        setRejectMessage(e.target.value)
                                      }
                                      disabled={isSaving}
                                      className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                      placeholder='Explain what needs to be changed...'
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant='outline'
                                      onClick={() => setRejectDialogOpen(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (!rejectMessage.trim()) {
                                          toast.error(
                                            'Please provide a reason for rejection',
                                          )
                                          return
                                        }
                                        onRejectDeliverable(
                                          rejectMessage.trim(),
                                        )
                                        setRejectDialogOpen(false)
                                        setRejectMessage('')
                                      }}
                                      disabled={!rejectMessage.trim()}
                                    >
                                      Reject
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ) : (
            <div className='space-y-3'>
              <div className='rounded-md border divide-y max-h-[180px] overflow-y-auto'>
                {[...subsequentEntries]
                  .reverse()
                  .map((entry: PeriodDeliverableReviewEntry, i: number) => {
                    const origIdx = thread.indexOf(entry)
                    const fileToShow = entry.file?.asset
                    const role =
                      (entry.role ?? 'Officer') === 'supervisor'
                        ? 'Supervisor'
                        : 'Officer'
                    const actionLabel: Record<string, string> = {
                      submit: 'Submitted for review',
                      approve: 'Approved',
                      reject: 'Rejected',
                      respond: 'Resubmitted',
                    }
                    const action =
                      actionLabel[entry.action ?? ''] ??
                      (entry.action ?? '').replace(/^./, (c: string) =>
                        c.toUpperCase(),
                      )
                    const dateStr = entry.createdAt
                      ? format(new Date(entry.createdAt), 'MMM d, yyyy, h:mm a')
                      : ''
                    const titleStr = `${role} ${action}${dateStr ? ` – ${dateStr}` : ''}`
                    return (
                      <div
                        key={entry._key ?? origIdx}
                        className='p-2.5 space-y-2'
                      >
                        <p className='text-xs text-muted-foreground'>
                          {titleStr}
                        </p>
                        {(entry.action === 'submit' ||
                          entry.action === 'respond') &&
                          fileToShow?.url && (
                            <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                              <Image
                                src='/pdf.png'
                                alt='PDF'
                                width={36}
                                height={36}
                                className='shrink-0 rounded'
                              />
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-medium truncate'>
                                  {fileToShow.originalFilename ??
                                    'document.pdf'}
                                </p>
                              </div>
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='h-7 w-7'
                                asChild
                              >
                                <a
                                  href={fileToShow.url}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='flex items-center justify-center'
                                  aria-label='View'
                                >
                                  <Eye className='h-4 w-4' />
                                </a>
                              </Button>
                            </div>
                          )}
                        {entry.message && (
                          <p className='text-sm text-foreground'>
                            {entry.message}
                          </p>
                        )}
                        {isPendingRejection(origIdx) &&
                          onRespondToDeliverableRejection && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => setResubmitDialogOpen(true)}
                              disabled={isSaving}
                            >
                              <Paperclip className='h-4 w-4' />
                              <span className='ml-1.5'>
                                Resubmit main deliverable
                              </span>
                            </Button>
                          )}
                        {!needsOfficerResubmit &&
                          subsequentEntries.length > 0 &&
                          i === 0 &&
                          entry.action === 'respond' &&
                          onApproveDeliverable &&
                          onRejectDeliverable && (
                            <div className='flex flex-wrap gap-2 pt-1'>
                              <Dialog
                                open={approveDialogOpen}
                                onOpenChange={setApproveDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={isSaving}
                                  >
                                    <ThumbsUp className='h-4 w-4' />
                                    <span className='ml-1.5'>Approve</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Approve deliverable
                                    </DialogTitle>
                                    <DialogDescription>
                                      Approval will mark this period as Done.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className='py-4'>
                                    <Label className='text-xs'>
                                      Reason (optional)
                                    </Label>
                                    <textarea
                                      value={approveReason}
                                      onChange={e =>
                                        setApproveReason(e.target.value)
                                      }
                                      disabled={isSaving}
                                      className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                      placeholder='Add an optional note...'
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant='outline'
                                      onClick={() =>
                                        setApproveDialogOpen(false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        onApproveDeliverable(
                                          approveReason.trim() || undefined,
                                        )
                                        setApproveDialogOpen(false)
                                        setApproveReason('')
                                      }}
                                    >
                                      Approve
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Dialog
                                open={rejectDialogOpen}
                                onOpenChange={setRejectDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={isSaving}
                                  >
                                    <ThumbsDown className='h-4 w-4' />
                                    <span className='ml-1.5'>Reject</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Reject deliverable
                                    </DialogTitle>
                                    <DialogDescription>
                                      The officer will be able to resubmit a
                                      replacement for the main deliverable.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className='py-4'>
                                    <Label className='text-xs' required>
                                      Reason
                                    </Label>
                                    <textarea
                                      value={rejectMessage}
                                      onChange={e =>
                                        setRejectMessage(e.target.value)
                                      }
                                      disabled={isSaving}
                                      className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                      placeholder='Explain what needs to be changed...'
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant='outline'
                                      onClick={() => setRejectDialogOpen(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (!rejectMessage.trim()) {
                                          toast.error(
                                            'Please provide a reason for rejection',
                                          )
                                          return
                                        }
                                        onRejectDeliverable(
                                          rejectMessage.trim(),
                                        )
                                        setRejectDialogOpen(false)
                                        setRejectMessage('')
                                      }}
                                      disabled={!rejectMessage.trim()}
                                    >
                                      Reject
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                      </div>
                    )
                  })}
                <div className='p-2.5 space-y-2'>
                  <p className='text-xs text-muted-foreground'>
                    Officer submitted main deliverable
                    {submitDateStr ? ` – ${submitDateStr}` : ''}
                  </p>
                  {mainFile?.url && (
                    <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                      <Image
                        src='/pdf.png'
                        alt='PDF'
                        width={36}
                        height={36}
                        className='shrink-0 rounded'
                      />
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate'>
                          {mainFile.originalFilename ?? 'document.pdf'}
                        </p>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='h-7 w-7'
                        asChild
                      >
                        <a
                          href={mainFile.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center justify-center'
                          aria-label='View'
                        >
                          <Eye className='h-4 w-4' />
                        </a>
                      </Button>
                    </div>
                  )}
                  {!needsOfficerResubmit &&
                    subsequentEntries.length === 0 &&
                    onApproveDeliverable &&
                    onRejectDeliverable && (
                      <div className='flex flex-wrap gap-2 pt-1'>
                        <Dialog
                          open={approveDialogOpen}
                          onOpenChange={setApproveDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              disabled={isSaving}
                            >
                              <ThumbsUp className='h-4 w-4' />
                              <span className='ml-1.5'>Approve</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve deliverable</DialogTitle>
                              <DialogDescription>
                                Approval will mark this period as Done.
                              </DialogDescription>
                            </DialogHeader>
                            <div className='py-4'>
                              <Label className='text-xs'>
                                Reason (optional)
                              </Label>
                              <textarea
                                value={approveReason}
                                onChange={e => setApproveReason(e.target.value)}
                                disabled={isSaving}
                                className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                placeholder='Add an optional note...'
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                variant='outline'
                                onClick={() => setApproveDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => {
                                  onApproveDeliverable(
                                    approveReason.trim() || undefined,
                                  )
                                  setApproveDialogOpen(false)
                                  setApproveReason('')
                                }}
                              >
                                Approve
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog
                          open={rejectDialogOpen}
                          onOpenChange={setRejectDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              disabled={isSaving}
                            >
                              <ThumbsDown className='h-4 w-4' />
                              <span className='ml-1.5'>Reject</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject deliverable</DialogTitle>
                              <DialogDescription>
                                The officer will be able to resubmit a
                                replacement for the main deliverable.
                              </DialogDescription>
                            </DialogHeader>
                            <div className='py-4'>
                              <Label className='text-xs' required>
                                Reason
                              </Label>
                              <textarea
                                value={rejectMessage}
                                onChange={e => setRejectMessage(e.target.value)}
                                disabled={isSaving}
                                className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                                placeholder='Explain what needs to be changed...'
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                variant='outline'
                                onClick={() => setRejectDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => {
                                  if (!rejectMessage.trim()) {
                                    toast.error(
                                      'Please provide a reason for rejection',
                                    )
                                    return
                                  }
                                  onRejectDeliverable(rejectMessage.trim())
                                  setRejectDialogOpen(false)
                                  setRejectMessage('')
                                }}
                                disabled={!rejectMessage.trim()}
                              >
                                Reject
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                </div>
              </div>
              {needsOfficerResubmit && onRespondToDeliverableRejection && (
                <Dialog
                  open={resubmitDialogOpen}
                  onOpenChange={open => {
                    if (!open && resubmitting) return
                    setResubmitDialogOpen(open)
                    if (!open) {
                      setResubmitFile(null)
                      setResubmitComment('')
                      resubmitFileRef.current &&
                        (resubmitFileRef.current.value = '')
                    }
                  }}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Resubmit main deliverable</DialogTitle>
                      <DialogDescription>
                        Upload a replacement file and add a note for the
                        supervisor.
                      </DialogDescription>
                    </DialogHeader>
                    <input
                      ref={resubmitFileRef}
                      type='file'
                      className='hidden'
                      accept='application/pdf,.pdf'
                      onChange={e => {
                        const f = e.target.files?.[0]
                        setResubmitFile(f ?? null)
                      }}
                    />
                    <div className='space-y-4 py-4'>
                      <div>
                        <Label className='text-xs'>
                          Main deliverable (PDF)
                        </Label>
                        <Button
                          type='button'
                          variant='outline'
                          className='w-full mt-1 justify-start'
                          onClick={() => resubmitFileRef.current?.click()}
                          disabled={resubmitting}
                        >
                          {resubmitFile ? resubmitFile.name : 'Choose file'}
                        </Button>
                      </div>
                      <div>
                        <Label className='text-xs'>Comment</Label>
                        <textarea
                          value={resubmitComment}
                          onChange={e => setResubmitComment(e.target.value)}
                          disabled={resubmitting}
                          className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm'
                          placeholder='Add a comment for the supervisor...'
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant='outline'
                        onClick={() => setResubmitDialogOpen(false)}
                        disabled={resubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleResubmit}
                        disabled={resubmitting || !resubmitFile}
                      >
                        {resubmitting ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          'Resubmit'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          ))}
        {!(periodStatus === 'in_review' || periodStatus === 'done') && (
          <>
            {mainDeliverable && mainFile?.url ? (
              <div className='space-y-2'>
                <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                  <Image
                    src='/pdf.png'
                    alt='PDF'
                    width={36}
                    height={36}
                    className='shrink-0 rounded'
                  />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>
                      {mainFile.originalFilename ?? 'document.pdf'}
                    </p>
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='h-7 w-7'
                      asChild
                    >
                      <a
                        href={mainFile.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center justify-center'
                        aria-label='View'
                      >
                        <Eye className='h-4 w-4' />
                      </a>
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='h-7 w-7'
                      asChild
                    >
                      <a
                        href={mainFile.url}
                        download
                        className='flex items-center justify-center'
                        aria-label='Download'
                      >
                        <Download className='h-4 w-4' />
                      </a>
                    </Button>
                    {!mainDeliverable?.locked &&
                      mainDeliverable?._key &&
                      onRemoveDeliverable && (
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() =>
                            onRemoveDeliverable(mainDeliverable._key!)
                          }
                          disabled={isSaving}
                          aria-label='Remove'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      )}
                  </div>
                </div>
                {periodStatus === 'delivered' &&
                  onSubmitForReview &&
                  !mainDeliverable?.locked && (
                      <Button
                        type='button'
                        size='sm'
                        onClick={onSubmitForReview}
                        disabled={isSaving || deliverablesLocked}
                      >
                        Submit for review
                      </Button>
                  )}
              </div>
            ) : (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onAddDeliverable('main')}
                disabled={
                  isSaving ||
                  deliverablesLocked ||
                  uploadingTag !== null ||
                  deliverable.some(
                    (e: PeriodDeliverableItem) =>
                      (e.tag ?? 'support') === 'main',
                  )
                }
              >
                {uploadingTag === 'main' ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Paperclip className='h-4 w-4' />
                )}
                <span className='ml-2'>Add Main Deliverable</span>
              </Button>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
