'use client'

import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AssessmentOfficerSubmissionRow } from '@/lib/assessments/types'

function submissionStatusLabel(
  row: AssessmentOfficerSubmissionRow,
): { label: string; variant: 'outline' | 'secondary' | 'default' } {
  if (row.status === 'not_started') {
    return { label: 'Not started', variant: 'outline' }
  }
  if (row.status === 'in_progress') {
    return { label: 'In progress', variant: 'secondary' }
  }
  if (row.submissionReason === 'abandoned') {
    return { label: 'Abandoned', variant: 'outline' }
  }
  if (row.submissionReason === 'timeout') {
    return { label: 'Timed out', variant: 'outline' }
  }
  return { label: 'Submitted', variant: 'default' }
}

interface AssessmentOfficerSubmissionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessmentTitle: string
  rows: AssessmentOfficerSubmissionRow[]
  resultsReleased?: boolean
  canReleaseResults?: boolean
  isReleasing?: boolean
  onReleaseResults?: () => void
  isLoading?: boolean
}

export function AssessmentOfficerSubmissionsSheet({
  open,
  onOpenChange,
  assessmentTitle,
  rows,
  resultsReleased = false,
  canReleaseResults = false,
  isReleasing = false,
  onReleaseResults,
  isLoading = false,
}: AssessmentOfficerSubmissionsSheetProps) {
  const submittedCount = rows.filter(row => row.status === 'submitted').length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex w-full flex-col sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>Officer submissions</SheetTitle>
          <SheetDescription>
            {assessmentTitle} · {submittedCount}/{rows.length} submitted
            {resultsReleased
              ? '. Results are visible to officers.'
              : submittedCount > 0
                ? '. Results are hidden from officers until you release them.'
                : ''}
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden'>
          {canReleaseResults && onReleaseResults ? (
            <Button
              type='button'
              onClick={onReleaseResults}
              disabled={isReleasing}
            >
              {isReleasing ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Release results to officers'
              )}
            </Button>
          ) : null}

          {isLoading ? (
            <div className='flex flex-1 items-center justify-center'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : rows.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              No officers are assigned to this section.
            </p>
          ) : (
            <div className='min-h-0 flex-1 overflow-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Officer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => {
                    const status = submissionStatusLabel(row)
                    return (
                      <TableRow key={row.officerId}>
                        <TableCell className='font-medium'>
                          {row.officerName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {row.status === 'submitted'
                            ? `${row.score ?? 0}/${row.maxScore ?? 0} (${row.percentScore ?? 0}%)`
                            : '—'}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {row.submittedAt
                            ? format(parseISO(row.submittedAt), 'PPp')
                            : row.status === 'in_progress' && row.startedAt
                              ? `Started ${format(parseISO(row.startedAt), 'PPp')}`
                              : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
