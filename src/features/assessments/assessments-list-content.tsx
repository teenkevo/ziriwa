'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileSpreadsheet, Plus } from 'lucide-react'

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
import type { AssessmentListRow } from '@/lib/assessments/types'
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
}

export function AssessmentsListContent({
  role,
  title,
  subtitle,
  basePath,
  dashboardHref,
  items,
  canManage,
}: AssessmentsListContentProps) {
  const [timeLimitDialog, setTimeLimitDialog] = React.useState<{
    assessmentId: string
    assessmentTitle: string
    currentMinutes?: number
  } | null>(null)

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
                    <TableCell>{item.attemptCount}</TableCell>
                  ) : null}
                  {role === 'officer' ? (
                    <TableCell>
                      {item.myAttemptId
                        ? `${item.myScore ?? 0}/${item.myMaxScore ?? 0} (${item.myPercentScore ?? 0}%)`
                        : item.myInProgressAttemptId
                          ? 'In progress'
                          : 'Not started'}
                    </TableCell>
                  ) : null}
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
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button type='button' variant='default' size='sm' asChild>
                      <WorkspaceRouteLink href={`${basePath}/${item._id}`}>
                        {item.myInProgressAttemptId
                          ? 'Resume'
                          : role === 'officer' && !item.myAttemptId
                            ? 'Start'
                            : 'Open'}
                      </WorkspaceRouteLink>
                    </Button>
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
    </div>
  )
}
