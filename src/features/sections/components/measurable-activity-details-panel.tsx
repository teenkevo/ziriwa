'use client'

import * as React from 'react'
import { Check, Loader2, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type {
  MeasurableActivity,
  MeasurableEvidenceItem,
} from '@/sanity/lib/section-contracts/get-section-contract'

export type EvidenceDraft = {
  _key: string
  label: string
  notes: string
  fileAsset?: { _type: 'reference'; _ref: string }
  fileName?: string
  fileUrl?: string
}

export function normalizeEvidenceDrafts(
  evidence: MeasurableEvidenceItem[] | undefined,
): EvidenceDraft[] {
  if (!evidence?.length) return []
  return evidence.map((item, index) => {
    const key = item._key || `ev-${index}`
    const assetId =
      item.file?.asset?._id || item.image?.asset?._id || item.asset?._id
    return {
      _key: key,
      label: item.label?.trim() || `Evidence ${index + 1}`,
      notes: item.notes?.trim() || '',
      fileAsset: assetId
        ? { _type: 'reference' as const, _ref: assetId }
        : undefined,
      fileName:
        item.file?.asset?.originalFilename ||
        item.image?.asset?.originalFilename ||
        item.asset?.originalFilename,
      fileUrl:
        item.file?.asset?.url || item.image?.asset?.url || item.asset?.url,
    }
  })
}

interface MeasurableActivityDetailsPanelProps {
  activity: MeasurableActivity | null
  canManage: boolean
  isSaving: boolean
  title: string
  status: string
  evidenceDrafts: EvidenceDraft[]
  onTitleChange: (value: string) => void
  onStatusChange: (value: string) => void
  onEvidenceChange: (drafts: EvidenceDraft[]) => void
  onSave: () => void
  onDelete: () => void
}

export function MeasurableActivityDetailsPanel({
  activity,
  canManage,
  isSaving,
  title,
  status,
  evidenceDrafts,
  onTitleChange,
  onStatusChange,
  onEvidenceChange,
  onSave,
  onDelete,
}: MeasurableActivityDetailsPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState(title)
  const titleEditRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setTitleDraft(title)
    setIsEditingTitle(false)
  }, [activity?._key, title])

  async function uploadEvidenceFile(draftKey: string, file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/sanity/upload', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Upload failed')
    const data = (await res.json()) as {
      asset?: { _id?: string; url?: string; originalFilename?: string }
    }
    const assetId = data.asset?._id
    if (!assetId) throw new Error('Upload returned no asset')
    onEvidenceChange(
      evidenceDrafts.map(item =>
        item._key === draftKey
          ? {
              ...item,
              fileAsset: { _type: 'reference', _ref: assetId },
              fileName: data.asset?.originalFilename || file.name,
              fileUrl: data.asset?.url,
            }
          : item,
      ),
    )
  }

  if (!activity) {
    return (
      <aside className='w-full lg:w-[24rem] shrink-0 border-l bg-muted/20 flex flex-col min-h-0 overflow-y-auto overscroll-contain'>
        <div className='p-6 flex flex-1 items-center justify-center'>
          <p className='text-sm text-muted-foreground text-center'>
            Select a measurable activity to view and edit details
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className='w-full lg:w-[24rem] shrink-0 border-l bg-muted/20 flex flex-col min-h-0 overflow-y-auto overscroll-contain'>
      <div className='p-4 space-y-6 flex-1 min-h-0'>
        <div>
          <Label className='text-xs text-muted-foreground'>
            Measurable activity
          </Label>
          {isEditingTitle ? (
            <div ref={titleEditRef} className='space-y-2 mt-1'>
              <textarea
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setTitleDraft(title)
                    setIsEditingTitle(false)
                  }
                }}
                autoFocus
                disabled={isSaving || !canManage}
                rows={3}
                className='flex min-h-[80px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                placeholder='Activity title'
              />
              <div className='flex gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={() => {
                    onTitleChange(titleDraft.trim())
                    setIsEditingTitle(false)
                  }}
                  disabled={isSaving || !titleDraft.trim()}
                >
                  <Check className='h-4 w-4' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={() => {
                    setTitleDraft(title)
                    setIsEditingTitle(false)
                  }}
                  disabled={isSaving}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                'text-sm rounded px-2 py-2 -mx-2 -my-1 mt-1 min-h-[2.5rem]',
                !canManage
                  ? 'text-muted-foreground cursor-not-allowed'
                  : 'cursor-pointer hover:bg-muted/50',
              )}
              onClick={() => {
                if (!canManage) return
                setTitleDraft(title)
                setIsEditingTitle(true)
              }}
            >
              {title || '—'}
            </p>
          )}
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>Type</Label>
          <p className='text-sm'>
            {activity.activityType === 'cross-cutting'
              ? 'Cross-cutting'
              : activity.activityType === 'core'
                ? 'Core'
                : activity.activityType}
          </p>
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>Status</Label>
          <Select
            value={status || 'not_started'}
            onValueChange={onStatusChange}
            disabled={!canManage || isSaving}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='not_started'>Not started</SelectItem>
              <SelectItem value='in_progress'>In progress</SelectItem>
              <SelectItem value='completed'>Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <div>
              <Label className='text-xs text-muted-foreground'>Evidence</Label>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Add one item or many — each has its own label and file.
              </p>
            </div>
            {canManage ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() =>
                  onEvidenceChange([
                    ...evidenceDrafts,
                    {
                      _key: crypto.randomUUID(),
                      label: `Evidence ${evidenceDrafts.length + 1}`,
                      notes: '',
                    },
                  ])
                }
              >
                Add
              </Button>
            ) : null}
          </div>

          {evidenceDrafts.length === 0 ? (
            <div className='rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground'>
              No evidence yet.
            </div>
          ) : (
            <div className='space-y-3'>
              {evidenceDrafts.map((item, index) => (
                <div
                  key={item._key}
                  className='rounded-lg border bg-background p-3 space-y-3'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                      Item {index + 1}
                    </p>
                    {canManage ? (
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='h-7 w-7 text-destructive'
                        onClick={() =>
                          onEvidenceChange(
                            evidenceDrafts.filter(row => row._key !== item._key),
                          )
                        }
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    ) : null}
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-xs'>Label</Label>
                    <Input
                      value={item.label}
                      disabled={!canManage || isSaving}
                      onChange={e =>
                        onEvidenceChange(
                          evidenceDrafts.map(row =>
                            row._key === item._key
                              ? { ...row, label: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder='e.g. Signed attendance sheet'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-xs'>Notes</Label>
                    <Textarea
                      value={item.notes}
                      disabled={!canManage || isSaving}
                      onChange={e =>
                        onEvidenceChange(
                          evidenceDrafts.map(row =>
                            row._key === item._key
                              ? { ...row, notes: e.target.value }
                              : row,
                          ),
                        )
                      }
                      rows={2}
                      placeholder='Optional context'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-xs'>File</Label>
                    {item.fileName || item.fileUrl ? (
                      <div className='flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs'>
                        <span className='truncate'>
                          {item.fileUrl ? (
                            <a
                              href={item.fileUrl}
                              target='_blank'
                              rel='noreferrer'
                              className='text-primary underline-offset-2 hover:underline'
                            >
                              {item.fileName || 'View file'}
                            </a>
                          ) : (
                            item.fileName
                          )}
                        </span>
                        {canManage ? (
                          <label className='inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground'>
                            <Upload className='h-3.5 w-3.5' />
                            Replace
                            <input
                              type='file'
                              className='hidden'
                              onChange={async e => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                  await uploadEvidenceFile(item._key, file)
                                  toast.success('File uploaded')
                                } catch (err) {
                                  toast.error(
                                    err instanceof Error
                                      ? err.message
                                      : 'Upload failed',
                                  )
                                }
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                    ) : canManage ? (
                      <label className='flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-3 py-6 text-xs text-muted-foreground hover:bg-muted/30'>
                        <Upload className='h-4 w-4' />
                        Upload evidence file
                        <input
                          type='file'
                          className='hidden'
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            try {
                              await uploadEvidenceFile(item._key, file)
                              toast.success('File uploaded')
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : 'Upload failed',
                              )
                            }
                          }}
                        />
                      </label>
                    ) : (
                      <p className='text-xs text-muted-foreground'>No file</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canManage ? (
          <div className='flex flex-wrap gap-2 pt-2'>
            <Button onClick={onSave} disabled={isSaving || !title.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
            <Button
              type='button'
              variant='outline'
              className='text-destructive hover:bg-destructive/10 hover:text-destructive'
              onClick={onDelete}
              disabled={isSaving}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
