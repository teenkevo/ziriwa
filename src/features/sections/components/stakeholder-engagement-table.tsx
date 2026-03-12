'use client'

import * as React from 'react'
import { Pencil, Trash2, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

const STAKEHOLDER_LABELS: Record<string, string> = {
  regulatory_body: 'Regulatory body',
  community_leader: 'Community leader',
  supplier: 'Supplier',
  partner_organization: 'Partner organization',
  internal: 'Internal',
  other: 'Other',
}

const MODE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  email: 'Email',
  report: 'Report',
  workshop: 'Workshop',
  phone_call: 'Phone call',
  site_visit: 'Site visit',
  other: 'Other',
}

type InitiativeOption = { code: string; title: string }

function isReportAllowed(proposedDate?: string): boolean {
  if (!proposedDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const engagementDate = new Date(proposedDate)
  engagementDate.setHours(0, 0, 0, 0)
  return engagementDate <= today
}

interface StakeholderEngagementTableProps {
  stakeholders: StakeholderEntry[]
  engagementId: string
  initiatives: InitiativeOption[]
  onEdit: (entry: StakeholderEntry, index: number) => void
  onDelete: (index: number) => void
  onReport?: (entry: StakeholderEntry, index: number) => void
}

export function StakeholderEngagementTable({
  stakeholders,
  engagementId,
  initiatives,
  onEdit,
  onDelete,
  onReport,
}: StakeholderEngagementTableProps) {
  const [deleteIndex, setDeleteIndex] = React.useState<number | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleConfirmDelete = async () => {
    if (deleteIndex === null) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/stakeholder-engagement/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteStakeholder',
          payload: { stakeholderIndex: deleteIndex },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      setDeleteIndex(null)
      onDelete(deleteIndex)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete stakeholder')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-10'>SN</TableHead>
              <TableHead>Stakeholder</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Linked Initiative</TableHead>
              <TableHead>Power</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Proposed Date</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className='w-24'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stakeholders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className='text-center text-muted-foreground py-8'>
                  No stakeholders yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              stakeholders.map((s, i) => (
                <TableRow key={s._key}>
                  <TableCell>{s.sn ?? i + 1}</TableCell>
                  <TableCell>
                    {STAKEHOLDER_LABELS[s.stakeholder ?? ''] ?? s.stakeholder ?? '—'}
                  </TableCell>
                  <TableCell>{s.designation ?? '—'}</TableCell>
                  <TableCell className='font-medium'>{s.name}</TableCell>
                  <TableCell>{s.initiativeCode ?? '—'}</TableCell>
                  <TableCell>{s.power ?? '—'}</TableCell>
                  <TableCell>{s.interest ?? '—'}</TableCell>
                  <TableCell>{s.priority ?? '—'}</TableCell>
                  <TableCell>
                    {s.proposedDateOfEngagement
                      ? new Date(s.proposedDateOfEngagement).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {MODE_LABELS[s.modeOfEngagement ?? ''] ?? s.modeOfEngagement ?? '—'}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider delayDuration={300}>
                      <div className='flex items-center gap-1'>
                        {onReport && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8'
                                disabled={!isReportAllowed(s.proposedDateOfEngagement)}
                                onClick={() =>
                                  isReportAllowed(s.proposedDateOfEngagement) && onReport(s, i)
                                }
                              >
                                <FileText className='h-4 w-4' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isReportAllowed(s.proposedDateOfEngagement)
                                ? 'Submit engagement report'
                                : 'Report available on or after proposed date'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8'
                              onClick={() => onEdit(s, i)}
                            >
                              <Pencil className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit stakeholder</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-destructive hover:text-destructive'
                              onClick={() => setDeleteIndex(i)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete stakeholder</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stakeholder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the stakeholder from the engagement matrix. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
