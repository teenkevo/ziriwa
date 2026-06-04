'use client'

import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { Download, Eye, ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  countSprintEvidenceSubmissions,
  type ContractTaskSprintCycleEvidence,
} from '@/lib/contract-task-sprint-evidence'
import type { WorkSubmission } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const SPRINT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
}

interface ContractTaskSprintEvidencePanelProps {
  cycles: ContractTaskSprintCycleEvidence[]
  /** Role-specific sprints URL (matches sidebar). */
  sprintsHref?: string
}

function ReadOnlySubmissionCard({
  submission,
}: {
  submission: WorkSubmission
}) {
  const outputAsset = submission.output?.asset
  const statusLabel =
    SUBMISSION_STATUS_LABELS[submission.status ?? 'pending'] ?? 'Pending review'

  return (
    <div className='rounded-md border bg-muted/20 p-3 space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs text-muted-foreground'>
          {submission.submittedAt
            ? format(new Date(submission.submittedAt), 'PPp')
            : '—'}
        </span>
        <Badge variant='outline' className='text-[10px]'>
          {statusLabel}
        </Badge>
      </div>
      {submission.description ? (
        <p className='text-sm'>{submission.description}</p>
      ) : null}
      {submission.totalHours != null ? (
        <p className='text-xs text-muted-foreground'>
          Hours: {submission.totalHours}
        </p>
      ) : null}
      {submission.revenueAssessed != null ? (
        <p className='text-xs text-muted-foreground'>
          Revenue assessed: {submission.revenueAssessed.toLocaleString()}
        </p>
      ) : null}
      {outputAsset?.url ? (
        <div className='flex items-center gap-3 rounded-md border bg-muted/30 p-2'>
          <Image
            src='/pdf.png'
            alt='PDF'
            width={28}
            height={28}
            className='shrink-0 rounded'
          />
          <p className='min-w-0 flex-1 truncate text-xs font-medium'>
            {outputAsset.originalFilename ?? 'output.pdf'}
          </p>
          <div className='flex shrink-0 items-center gap-1'>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-6 w-6'
              asChild
            >
              <a
                href={outputAsset.url}
                target='_blank'
                rel='noopener noreferrer'
                aria-label='View file'
              >
                <Eye className='h-3 w-3' />
              </a>
            </Button>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-6 w-6'
              asChild
            >
              <a href={outputAsset.url} download aria-label='Download file'>
                <Download className='h-3 w-3' />
              </a>
            </Button>
          </div>
        </div>
      ) : null}
      {(submission.reviewThread ?? []).length > 0 ? (
        <ul className='space-y-1 border-t pt-2'>
          {(submission.reviewThread ?? []).map(entry => (
            <li
              key={entry._key ?? entry.createdAt}
              className='text-xs text-muted-foreground'
            >
              <span className='font-medium capitalize'>
                {entry.role ?? '—'}
              </span>
              {entry.action ? ` · ${entry.action}` : ''}
              {entry.message ? ` — ${entry.message}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ContractTaskSprintEvidencePanel({
  cycles,
  sprintsHref,
}: ContractTaskSprintEvidencePanelProps) {
  const submissionCount = countSprintEvidenceSubmissions(cycles)

  return (
    <div className='space-y-4 pb-10'>
      <div className='space-y-2'>
        <Label className='text-xs text-muted-foreground'>Deliverables</Label>
        <p className='text-xs text-muted-foreground leading-relaxed'>
          Deliverables are submitted in weekly sprint activities linked to this
          detailed task.
        </p>
        {sprintsHref ? (
          <Button variant='link' className='h-auto p-0 text-xs' asChild>
            <Link href={sprintsHref}>
              Open weekly sprints
              <ExternalLink className='ml-1 h-3 w-3' />
            </Link>
          </Button>
        ) : null}
      </div>

      {cycles.length === 0 ? (
        <p className='rounded-md border border-dashed p-3 text-xs text-muted-foreground'>
          No deliverables have been submitted yet.
        </p>
      ) : submissionCount === 0 ? (
        <p className='rounded-md border border-dashed p-3 text-xs text-muted-foreground'>
          This task is linked in {cycles.length} sprint
          {cycles.length === 1 ? '' : 's'}, but no work submissions have been
          recorded yet.
        </p>
      ) : (
        <Accordion type='multiple' className='w-full'>
          {cycles.map(cycle => (
            <AccordionItem
              key={`${cycle.sprintId}-${cycle.sprintTaskKey}`}
              value={cycle.sprintTaskKey}
            >
              <AccordionTrigger className='py-3 text-left text-xs hover:no-underline'>
                <span className='flex flex-col gap-0.5 pr-2'>
                  <span className='font-medium'>{cycle.weekLabel}</span>
                  <span className='font-normal text-muted-foreground'>
                    {format(new Date(cycle.weekStart), 'd MMM')} –{' '}
                    {format(new Date(cycle.weekEnd), 'd MMM yyyy')}
                    {' · '}
                    {SPRINT_STATUS_LABELS[cycle.sprintStatus] ??
                      cycle.sprintStatus}
                    {' · '}
                    {cycle.workSubmissions.length} submission
                    {cycle.workSubmissions.length === 1 ? '' : 's'}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className='space-y-3 pb-3'>
                <p className='text-xs text-muted-foreground'>
                  {cycle.sprintTaskDescription}
                </p>
                {cycle.workSubmissions.map(sub => (
                  <ReadOnlySubmissionCard key={sub._key} submission={sub} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
