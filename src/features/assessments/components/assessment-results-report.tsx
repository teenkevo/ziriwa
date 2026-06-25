'use client'

import { CheckCircle2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AssessmentResultsReport } from '@/lib/assessments/results-report'
import { cn } from '@/lib/utils'

interface AssessmentResultsReportViewProps {
  report: AssessmentResultsReport
  assessmentTitle: string
  className?: string
}

function BreakdownTable({
  title,
  description,
  columnLabel,
  rows,
}: {
  title: string
  description: string
  columnLabel: string
  rows: AssessmentResultsReport['byArea']
}) {
  if (rows.length === 0) return null

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className='pt-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{columnLabel}</TableHead>
              <TableHead className='w-28 text-right'>Score</TableHead>
              <TableHead className='w-36'>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.key}>
                <TableCell className='font-medium'>{row.label}</TableCell>
                <TableCell className='text-right tabular-nums'>
                  {row.correct}/{row.total} ({row.percent}%)
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <Progress value={row.percent} className='h-2 flex-1' />
                    <span className='w-10 text-right text-xs tabular-nums text-muted-foreground'>
                      {row.percent}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function AssessmentResultsReportView({
  report,
  assessmentTitle,
  className,
}: AssessmentResultsReportViewProps) {
  const passedCount = report.questionOutcomes.filter(
    outcome => outcome.isCorrect,
  ).length
  const failedCount = report.questionOutcomes.length - passedCount

  return (
    <div className={cn('mx-auto flex w-full max-w-4xl flex-col gap-6', className)}>
      <div className='space-y-2 text-center'>
        <h2 className='text-2xl font-semibold tracking-tight'>
          Results report
        </h2>
        <p className='text-sm text-muted-foreground'>{assessmentTitle}</p>
      </div>

      <Card className='border-primary/20 bg-primary/5'>
        <CardContent className='flex flex-col items-center gap-2 py-6'>
          <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>
            Overall score
          </p>
          <p className='text-4xl font-semibold tabular-nums'>
            {report.score}/{report.maxScore}
          </p>
          <Badge variant='secondary' className='text-sm'>
            {report.percentScore}%
          </Badge>
          <div className='mt-2 flex flex-wrap justify-center gap-3 text-sm'>
            <span className='inline-flex items-center gap-1.5 text-emerald-700'>
              <CheckCircle2 className='h-4 w-4' aria-hidden='true' />
              {passedCount} passed
            </span>
            <span className='inline-flex items-center gap-1.5 text-destructive'>
              <XCircle className='h-4 w-4' aria-hidden='true' />
              {failedCount} failed
            </span>
          </div>
        </CardContent>
      </Card>

      <BreakdownTable
        title='By assessed area'
        description='How you performed across each topic area in this assessment.'
        columnLabel='Area'
        rows={report.byArea}
      />

      <BreakdownTable
        title='By difficulty level'
        description='Your results grouped by question difficulty.'
        columnLabel='Difficulty'
        rows={report.byDifficulty}
      />
    </div>
  )
}
