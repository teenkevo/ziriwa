'use client'

import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  CascadeActivityRewrite,
  CascadeRewritePreviewItem,
} from '@/lib/contract-cascade/types'
import { syncObjectiveAcrossInitiative } from '@/features/sections/components/cascade-import-client'

interface SupervisorCascadeRewriteReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CascadeRewritePreviewItem[]
  drafts: Record<string, CascadeActivityRewrite>
  onDraftsChange: (drafts: Record<string, CascadeActivityRewrite>) => void
  modeLabel: 'AI suggestions' | 'As-is preview'
  isProjectWorkstream?: boolean
  isSubmitting?: boolean
  onConfirmImport: () => void
  onBack: () => void
}

function groupItemsByInitiative(items: CascadeRewritePreviewItem[]) {
  const groups = new Map<string, CascadeRewritePreviewItem[]>()
  for (const item of items) {
    const list = groups.get(item.initiativeKey) ?? []
    list.push(item)
    groups.set(item.initiativeKey, list)
  }
  return Array.from(groups.entries())
}

export function SupervisorCascadeRewriteReviewDialog({
  open,
  onOpenChange,
  items,
  drafts,
  onDraftsChange,
  modeLabel,
  isProjectWorkstream = false,
  isSubmitting = false,
  onConfirmImport,
  onBack,
}: SupervisorCascadeRewriteReviewDialogProps) {
  const groupedItems = React.useMemo(
    () => groupItemsByInitiative(items),
    [items],
  )

  function updateDraft(
    activityKey: string,
    patch: Partial<CascadeActivityRewrite>,
  ) {
    const current = drafts[activityKey]
    if (!current) return
    const next = { ...drafts, [activityKey]: { ...current, ...patch } }
    if (patch.objectiveTitle) {
      onDraftsChange(
        syncObjectiveAcrossInitiative(
          next,
          current.initiativeKey,
          patch.objectiveTitle,
        ),
      )
      return
    }
    onDraftsChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableClose={isSubmitting}
        className='max-w-3xl sm:max-w-4xl'
      >
        <DialogHeader>
          <DialogTitle>Review cascaded wording</DialogTitle>
          <DialogDescription>
            {modeLabel}. Edit anything before importing to your contract.
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-[min(70vh,720px)] space-y-4 overflow-y-auto py-2 pr-1'>
          {groupedItems.map(([initiativeKey, groupItems]) => {
            const leadItem = groupItems[0]
            const leadDraft = drafts[leadItem.activityKey]
            if (!leadDraft) return null

            return (
              <section
                key={initiativeKey}
                className='rounded-lg border bg-muted/20 p-4 space-y-4'
              >
                <div className='space-y-1'>
                  <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    {isProjectWorkstream
                      ? 'Project manager initiative source'
                      : 'Manager initiative source'}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {leadItem.managerInitiativeTitle}
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor={`objective-${initiativeKey}`}>
                    Your SSMARTA objective
                  </Label>
                  <Textarea
                    id={`objective-${initiativeKey}`}
                    value={leadDraft.objectiveTitle}
                    onChange={event =>
                      updateDraft(leadItem.activityKey, {
                        objectiveTitle: event.target.value,
                      })
                    }
                    rows={2}
                    disabled={isSubmitting}
                  />
                  <p className='text-xs text-muted-foreground'>
                    Starts with &quot;Achieve…&quot; and includes target/date
                    when relevant.
                  </p>
                </div>

                {groupItems.map(item => {
                  const draft = drafts[item.activityKey]
                  if (!draft) return null

                  return (
                    <div
                      key={item.activityKey}
                      className='rounded-md border bg-background p-4 space-y-4'
                    >
                      <div className='grid gap-3 md:grid-cols-2'>
                        <div className='space-y-1'>
                          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                            {isProjectWorkstream
                              ? 'Project manager MA'
                              : 'Manager KPI'}
                          </p>
                          <p className='text-sm'>{item.managerKpiTitle}</p>
                        </div>
                        {!isProjectWorkstream ? (
                          <div className='space-y-1'>
                            <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                              Manager AIM
                            </p>
                            <p className='text-sm'>{item.managerAim}</p>
                          </div>
                        ) : null}
                      </div>

                      {item.validationWarnings.length > 0 ? (
                        <Alert variant='default' className='border-amber-200 bg-amber-50'>
                          <AlertTriangle className='h-4 w-4 text-amber-700' />
                          <AlertDescription className='text-amber-900'>
                            {item.validationWarnings.join(' ')}
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      <div className='space-y-2'>
                        <Label htmlFor={`initiative-${item.activityKey}`}>
                          Your initiative
                        </Label>
                        <Textarea
                          id={`initiative-${item.activityKey}`}
                          value={draft.initiativeTitle}
                          onChange={event =>
                            updateDraft(item.activityKey, {
                              initiativeTitle: event.target.value,
                            })
                          }
                          rows={2}
                          disabled={isSubmitting}
                        />
                      </div>

                      {!isProjectWorkstream ? (
                        <>
                          <div className='space-y-2'>
                            <Label htmlFor={`kpi-${item.activityKey}`}>
                              Your KPI
                            </Label>
                            <Textarea
                              id={`kpi-${item.activityKey}`}
                              value={draft.measurableTitle}
                              onChange={event =>
                                updateDraft(item.activityKey, {
                                  measurableTitle: event.target.value,
                                })
                              }
                              rows={2}
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className='space-y-2'>
                            <Label htmlFor={`tasks-${item.activityKey}`}>
                              Detailed tasks (one per line)
                            </Label>
                            <Textarea
                              id={`tasks-${item.activityKey}`}
                              value={draft.tasks.join('\n')}
                              onChange={event =>
                                updateDraft(item.activityKey, {
                                  tasks: event.target.value
                                    .split('\n')
                                    .map(line => line.trim())
                                    .filter(Boolean),
                                })
                              }
                              rows={3}
                              disabled={isSubmitting}
                            />
                          </div>
                        </>
                      ) : (
                        <p className='text-xs text-muted-foreground'>
                          Add measurable activities on your contract page after
                          import.
                        </p>
                      )}
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button type='button' onClick={onConfirmImport} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Importing…
              </>
            ) : (
              isProjectWorkstream
                ? `Import ${items.length} initiative${items.length === 1 ? '' : 's'}`
                : `Import ${items.length} KPI${items.length === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
