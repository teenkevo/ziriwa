'use client'

import * as React from 'react'
import {
  Pencil,
  Trash2,
  FileText,
  ListChecks,
  MoreVertical,
  ScrollText,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  onActionPoints?: (entry: StakeholderEntry, index: number) => void
  onMinutes?: (entry: StakeholderEntry, index: number) => void
}

export function StakeholderEngagementTable({
  stakeholders,
  engagementId,
  initiatives,
  onEdit,
  onDelete,
  onReport,
  onActionPoints,
  onMinutes,
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
              <TableHead className='w-12'>
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stakeholders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className='text-center text-muted-foreground py-8'
                >
                  No stakeholders yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              stakeholders.map((s, i) => (
                <TableRow key={s._key}>
                  <TableCell>{s.sn ?? i + 1}</TableCell>
                  <TableCell>
                    {STAKEHOLDER_LABELS[s.stakeholder ?? ''] ??
                      s.stakeholder ??
                      '—'}
                  </TableCell>
                  <TableCell>{s.designation ?? '—'}</TableCell>
                  <TableCell className='font-medium'>{s.name}</TableCell>
                  <TableCell>{s.initiativeCode ?? '—'}</TableCell>
                  <TableCell>{s.power ?? '—'}</TableCell>
                  <TableCell>{s.interest ?? '—'}</TableCell>
                  <TableCell>{s.priority ?? '—'}</TableCell>
                  <TableCell>
                    {s.proposedDateOfEngagement
                      ? new Date(
                          s.proposedDateOfEngagement,
                        ).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {MODE_LABELS[s.modeOfEngagement ?? ''] ??
                      s.modeOfEngagement ??
                      '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-muted-foreground'
                        >
                          <MoreVertical className='h-4 w-4' />
                          <span className='sr-only'>Actions for {s.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-52'>
                        <DropdownMenuItem onClick={() => onEdit(s, i)}>
                          <Pencil className='mr-2 h-4 w-4' />
                          Edit stakeholder
                        </DropdownMenuItem>
                        {onMinutes ? (
                          <DropdownMenuItem onClick={() => onMinutes(s, i)}>
                            <ScrollText className='mr-2 h-4 w-4' />
                            {s.minutes?.status === 'published'
                              ? 'View minutes'
                              : s.minutes
                                ? 'Edit minutes'
                                : 'Write minutes'}
                          </DropdownMenuItem>
                        ) : null}
                        {onActionPoints ? (
                          <DropdownMenuItem
                            onClick={() => onActionPoints(s, i)}
                          >
                            <ListChecks className='mr-2 h-4 w-4' />
                            {s.actionPoints?.length
                              ? `Action points (${s.actionPoints.length})`
                              : 'Assign action points'}
                          </DropdownMenuItem>
                        ) : null}
                        {onReport ? (
                          <DropdownMenuItem
                            disabled={
                              !isReportAllowed(s.proposedDateOfEngagement)
                            }
                            onClick={() =>
                              isReportAllowed(s.proposedDateOfEngagement) &&
                              onReport(s, i)
                            }
                          >
                            <FileText className='mr-2 h-4 w-4' />
                            Engagement report
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-destructive focus:text-destructive'
                          onClick={() => setDeleteIndex(i)}
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete stakeholder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={() => setDeleteIndex(null)}
      >
        <AlertDialogContent disableClose={isDeleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stakeholder?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIndex !== null && stakeholders.length === 1
                ? 'This will remove the stakeholder, delete all associated reports, minutes, action points, and files, and remove the engagement matrix for this period. This cannot be undone.'
                : 'This will remove the stakeholder and delete all associated reports, minutes, action points, and files. This cannot be undone.'}
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
