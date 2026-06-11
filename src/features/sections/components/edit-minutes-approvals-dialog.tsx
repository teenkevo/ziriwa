'use client'

import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { StakeholderMinutes } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

type StaffOption = { _id: string; fullName?: string; staffId?: string }

const APPROVER_BODY_MIN_HEIGHT_PX = 172
const APPROVER_BODY_MAX_HEIGHT_PX = 360

function useMeasuredHeight(dependency: unknown, open: boolean) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!open) setHeight(null)
  }, [open])

  React.useLayoutEffect(() => {
    if (!open) return
    const node = contentRef.current
    if (!node) return

    const updateHeight = () => {
      setHeight(node.scrollHeight)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(node)
    return () => observer.disconnect()
  }, [dependency, open])

  return { contentRef, height }
}

interface EditMinutesApprovalsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  minutes?: StakeholderMinutes
  staffOptions: StaffOption[]
  isSaving?: boolean
  onSave: (approverIds: string[]) => Promise<void>
}

function emptyRow(): string {
  return ''
}

export function EditMinutesApprovalsDialog({
  open,
  onOpenChange,
  minutes,
  staffOptions,
  isSaving = false,
  onSave,
}: EditMinutesApprovalsDialogProps) {
  const [rows, setRows] = React.useState<string[]>([emptyRow()])

  React.useEffect(() => {
    if (!open) return
    const existing =
      minutes?.approvals
        ?.map(approval => approval.assignee?._id)
        .filter((id): id is string => Boolean(id)) ?? []
    setRows(existing.length > 0 ? existing : [emptyRow()])
  }, [open, minutes])

  const displayRows = rows.length > 0 ? rows : [emptyRow()]

  const updateRow = (index: number, value: string) => {
    setRows(prev => prev.map((row, i) => (i === index ? value : row)))
  }

  const addRow = () => setRows(prev => [...prev, emptyRow()])

  const removeRow = (index: number) => {
    setRows(prev =>
      prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const approverIds = [...new Set(rows.filter(Boolean))]
    await onSave(approverIds)
  }

  const usedIds = new Set(rows.filter(Boolean))
  const hasApprovers = rows.some(Boolean)
  const { contentRef, height } = useMeasuredHeight(displayRows.length, open)
  const measuredHeight = height ?? APPROVER_BODY_MIN_HEIGHT_PX
  const bodyHeight = Math.max(
    APPROVER_BODY_MIN_HEIGHT_PX,
    Math.min(measuredHeight, APPROVER_BODY_MAX_HEIGHT_PX),
  )
  const isBodyScrollable = measuredHeight > APPROVER_BODY_MAX_HEIGHT_PX

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableClose={isSaving}
        layout='scrollable'
        className='max-w-lg'
      >
        <form onSubmit={handleSubmit} className='flex w-full flex-col'>
          <DialogHeader className='shrink-0 pr-8'>
            <DialogTitle>Edit approval details</DialogTitle>
            <DialogDescription>
              Assign approvers for these minutes before they can be published.
            </DialogDescription>
          </DialogHeader>
          <div
            className={cn(
              'overflow-hidden transition-[height] duration-300 ease-in-out px-0.5 pt-2',
              isBodyScrollable && 'overflow-y-auto overscroll-contain',
            )}
            style={{ height: bodyHeight }}
          >
            <div
              ref={contentRef}
              className='space-y-4 py-2 pr-1 pb-3'
              style={{ minHeight: APPROVER_BODY_MIN_HEIGHT_PX }}
            >
              <div className='space-y-3'>
                {displayRows.map((row, index) => (
                  <div
                    key={`approver-${index}`}
                    className='flex animate-in fade-in-0 slide-in-from-top-2 items-end gap-2 duration-300'
                  >
                    <div className='flex-1 space-y-2'>
                      <Label htmlFor={`minutes-approver-${index}`}>
                        Approver {index + 1}
                      </Label>
                      <Select
                        value={row}
                        onValueChange={value => updateRow(index, value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger id={`minutes-approver-${index}`}>
                          <SelectValue placeholder='Select approver' />
                        </SelectTrigger>
                        <SelectContent>
                          {staffOptions.map(staff => (
                            <SelectItem
                              key={staff._id}
                              value={staff._id}
                              disabled={
                                usedIds.has(staff._id) && staff._id !== row
                              }
                            >
                              {staff.fullName}
                              {staff.staffId ? ` (${staff.staffId})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='mb-0.5 text-destructive hover:text-destructive'
                      onClick={() => removeRow(index)}
                      disabled={isSaving}
                      aria-label={`Remove approver ${index + 1}`}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addRow}
                disabled={isSaving}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add approver
              </Button>
            </div>
          </div>
          <DialogFooter className='shrink-0 border-t pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !hasApprovers}>
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save approvals'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
