'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileSpreadsheet, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { AllClearState } from '@/components/all-clear-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WorkspaceRouteLink } from '@/components/workspace-route-link'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { SetAssessmentTimeLimitDialog } from '@/features/assessments/components/set-assessment-time-limit-dialog'
import {
  AssessmentListStartStatus,
  useAssessmentStartCountdown,
} from '@/features/assessments/components/assessment-start-countdown'
import { SetAssessmentStartTimeDialog } from '@/features/assessments/components/set-assessment-start-time-dialog'
import { AssessmentOfficerSubmissionsSheet } from '@/features/assessments/components/assessment-officer-submissions-sheet'
import {
  AssessmentOfficerAttemptReviewDialog,
  type AssessmentOfficerAttemptReviewTarget,
} from '@/features/assessments/components/assessment-officer-attempt-review-dialog'
import type {
  AssessmentListRow,
  AssessmentOfficerSubmissionRow,
} from '@/lib/assessments/types'
import { assessmentStatusLabel } from '@/lib/assessments/scoring'
import { formatTimeLimitMinutes } from '@/lib/assessments/time-limit'

interface AssessmentsListContentProps {
  role: 'manager' | 'supervisor' | 'officer'
  title: string
  subtitle: string
  basePath: string
  dashboardHref: string
  items: AssessmentListRow[]
  canManage: boolean
  sectionOfficerCount?: number
  canViewSubmissions?: boolean
}

export function AssessmentsListContent({
  role,
  title,
  subtitle,
  basePath,
  dashboardHref,
  items,
  canManage,
  sectionOfficerCount = 0,
  canViewSubmissions = false,
}: AssessmentsListContentProps) {
  const router = useRouter()
  const [timeLimitDialog, setTimeLimitDialog] = React.useState<{
    assessmentId: string
    assessmentTitle: string
    currentMinutes?: number
  } | null>(null)
  const [startTimeDialog, setStartTimeDialog] = React.useState<{
    assessmentId: string
    assessmentTitle: string
    currentStartsAt?: string
  } | null>(null)
  const [submissionsSheet, setSubmissionsSheet] = React.useState<{
    assessmentId: string
    assessmentTitle: string
    assessmentStatus?: AssessmentListRow['status']
    attemptCount: number
    rows: AssessmentOfficerSubmissionRow[]
    resultsReleased: boolean
  } | null>(null)
  const [isLoadingSubmissions, setIsLoadingSubmissions] = React.useState(false)
  const [isReleasingResults, setIsReleasingResults] = React.useState(false)
  const [attemptReviewTarget, setAttemptReviewTarget] =
    React.useState<AssessmentOfficerAttemptReviewTarget | null>(null)

  async function handleReleaseResults(assessmentId: string) {
    if (
      !window.confirm(
        'Release results to officers? They will be able to view their scores, area breakdown, and feedback.',
      )
    ) {
      return
    }

    setIsReleasingResults(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'releaseResults' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to release results')

      toast.success('Results released to officers')
      setSubmissionsSheet(current =>
        current ? { ...current, resultsReleased: true } : current,
      )
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to release results',
      )
    } finally {
      setIsReleasingResults(false)
    }
  }

  function canReleaseResultsForItem(item: AssessmentListRow) {
    return (
      canManage &&
      item.status === 'published' &&
      item.attemptCount > 0 &&
      !item.resultsReleased
    )
  }

  async function openSubmissionsSheet(item: AssessmentListRow) {
    setSubmissionsSheet({
      assessmentId: item._id,
      assessmentTitle: item.title,
      assessmentStatus: item.status,
      attemptCount: item.attemptCount,
      rows: [],
      resultsReleased: Boolean(item.resultsReleased),
    })
    setIsLoadingSubmissions(true)
    try {
      const res = await fetch(`/api/assessments/${item._id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to load submissions')
      setSubmissionsSheet({
        assessmentId: item._id,
        assessmentTitle: item.title,
        assessmentStatus: item.status,
        attemptCount: item.attemptCount,
        rows: Array.isArray(data.officerSubmissions)
          ? data.officerSubmissions
          : [],
        resultsReleased: Boolean(data.assessment?.resultsReleasedAt),
      })
    } catch (error) {
      console.error(error)
      setSubmissionsSheet(null)
    } finally {
      setIsLoadingSubmissions(false)
    }
  }

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        { label: role.charAt(0).toUpperCase() + role.slice(1), href: dashboardHref },
        { label: title },
      ],
      [dashboardHref, role, title],
    ),
  )

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        </div>
        {canManage ? (
          <div className='flex flex-wrap gap-2'>
            <Button type='button' asChild>
              <Link href={`${basePath}/new`}>
                <Plus className='mr-2 h-4 w-4' />
                Create assessment
              </Link>
            </Button>
            <Button type='button' variant='outline' asChild>
              <Link href={`${basePath}/import`}>
                <FileSpreadsheet className='mr-2 h-4 w-4' />
                Import Excel
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <AllClearState
          title='No assessments yet'
          description={
            canManage
              ? 'Create an assessment manually or import questions from Excel.'
              : 'Published assessments will appear here when your manager assigns them.'
          }
        />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                {canManage ? <TableHead>Status</TableHead> : null}
                <TableHead>Questions</TableHead>
                {role !== 'officer' ? <TableHead>Submissions</TableHead> : null}
                {role === 'officer' ? <TableHead>Your result</TableHead> : null}
                <TableHead>Starts</TableHead>
                <TableHead>Time limit</TableHead>
                <TableHead className='w-[100px]' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item._id}>
                  <TableCell className='font-medium'>{item.title}</TableCell>
                  {canManage ? (
                    <TableCell>
                      <Badge variant='outline'>
                        {assessmentStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                  ) : null}
                  <TableCell>{item.questionCount}</TableCell>
                  {role !== 'officer' ? (
                    <TableCell>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm'>
                          {item.attemptCount}/{sectionOfficerCount}
                        </span>
                        {canViewSubmissions ? (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-xs'
                            onClick={() => void openSubmissionsSheet(item)}
                          >
                            View marks
                          </Button>
                        ) : null}
                        {canReleaseResultsForItem(item) ? (
                          <Button
                            type='button'
                            size='sm'
                            className='h-7 px-2 text-xs'
                            disabled={isReleasingResults}
                            onClick={() => void handleReleaseResults(item._id)}
                          >
                            Release results
                          </Button>
                        ) : canManage && item.resultsReleased ? (
                          <Badge variant='outline' className='h-7 px-2 text-xs'>
                            Results released
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                  {role === 'officer' ? (
                    <TableCell>
                      {item.myAttemptId
                        ? item.resultsReleased
                          ? `${item.myScore ?? 0}/${item.myMaxScore ?? 0} (${item.myPercentScore ?? 0}%)`
                          : 'Submitted'
                        : item.myInProgressAttemptId
                          ? 'In progress'
                          : 'Not started'}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    {canManage ? (
                      <div className='flex flex-wrap items-center gap-2'>
                        <AssessmentListStartStatus
                          startsAt={item.startsAt}
                          compact={Boolean(item.startsAt)}
                        />
                        <Button
                          type='button'
                          variant={item.startsAt ? 'ghost' : 'outline'}
                          size='sm'
                          className={item.startsAt ? 'h-7 px-2 text-xs' : undefined}
                          onClick={() =>
                            setStartTimeDialog({
                              assessmentId: item._id,
                              assessmentTitle: item.title,
                              currentStartsAt: item.startsAt,
                            })
                          }
                        >
                          {item.startsAt ? 'Edit' : 'Set start time'}
                        </Button>
                      </div>
                    ) : (
                      <AssessmentListStartStatus startsAt={item.startsAt} />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.timeLimitMinutes ? (
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm'>
                          {formatTimeLimitMinutes(item.timeLimitMinutes)}
                        </span>
                        {canManage ? (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-7 px-2 text-xs'
                            onClick={() =>
                              setTimeLimitDialog({
                                assessmentId: item._id,
                                assessmentTitle: item.title,
                                currentMinutes: item.timeLimitMinutes,
                              })
                            }
                          >
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    ) : canManage ? (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setTimeLimitDialog({
                            assessmentId: item._id,
                            assessmentTitle: item.title,
                          })
                        }
                      >
                        Set time limit
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-wrap justify-end gap-2'>
                      <AssessmentOpenButton
                        item={item}
                        role={role}
                        basePath={basePath}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {timeLimitDialog ? (
        <SetAssessmentTimeLimitDialog
          assessmentId={timeLimitDialog.assessmentId}
          assessmentTitle={timeLimitDialog.assessmentTitle}
          currentMinutes={timeLimitDialog.currentMinutes}
          open
          onOpenChange={open => {
            if (!open) setTimeLimitDialog(null)
          }}
        />
      ) : null}
      {startTimeDialog ? (
        <SetAssessmentStartTimeDialog
          assessmentId={startTimeDialog.assessmentId}
          assessmentTitle={startTimeDialog.assessmentTitle}
          currentStartsAt={startTimeDialog.currentStartsAt}
          open
          onOpenChange={open => {
            if (!open) setStartTimeDialog(null)
          }}
        />
      ) : null}
      {submissionsSheet ? (
        <AssessmentOfficerSubmissionsSheet
          open
          onOpenChange={open => {
            if (!open) setSubmissionsSheet(null)
          }}
          assessmentTitle={submissionsSheet.assessmentTitle}
          rows={submissionsSheet.rows}
          resultsReleased={submissionsSheet.resultsReleased}
          canReleaseResults={
            canManage &&
            submissionsSheet.assessmentStatus === 'published' &&
            submissionsSheet.attemptCount > 0 &&
            !submissionsSheet.resultsReleased
          }
          isReleasing={isReleasingResults}
          onReleaseResults={() =>
            void handleReleaseResults(submissionsSheet.assessmentId)
          }
          onViewAttempt={row => {
            if (!row.attemptId || !submissionsSheet) return
            setAttemptReviewTarget({
              assessmentId: submissionsSheet.assessmentId,
              attemptId: row.attemptId,
              officerName: row.officerName,
            })
          }}
          isLoading={isLoadingSubmissions}
        />
      ) : null}

      <AssessmentOfficerAttemptReviewDialog
        target={attemptReviewTarget}
        onOpenChange={open => {
          if (!open) setAttemptReviewTarget(null)
        }}
      />
    </div>
  )
}

function AssessmentOpenButton({
  item,
  role,
  basePath,
}: {
  item: AssessmentListRow
  role: 'manager' | 'supervisor' | 'officer'
  basePath: string
}) {
  const { hasStarted: hasStartTimeElapsed } = useAssessmentStartCountdown(
    item.startsAt,
  )
  const isOfficer = role === 'officer'
  const hasSubmitted = Boolean(item.myAttemptId)
  const hasInProgress = Boolean(item.myInProgressAttemptId)
  const isStartReady = item.canStart === true || hasStartTimeElapsed

  const label = hasInProgress
    ? 'Resume'
    : isOfficer && !hasSubmitted
      ? 'Start'
      : 'Open'

  const isStartDisabled =
    isOfficer &&
    !hasSubmitted &&
    !hasInProgress &&
    !isStartReady

  if (isStartDisabled) {
    return (
      <Button type='button' variant='default' size='sm' disabled>
        {label}
      </Button>
    )
  }

  return (
    <Button type='button' variant='default' size='sm' asChild>
      <WorkspaceRouteLink href={`${basePath}/${item._id}`}>{label}</WorkspaceRouteLink>
    </Button>
  )
}
