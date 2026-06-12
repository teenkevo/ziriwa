'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { CalendarDays, FileBarChart, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { resolveSprintTaskStatus } from '@/lib/sprint-task-status'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type WeeklyReportDownloadButtonProps = {
  sectionName: string
  sprint: WeeklySprint
}

const WeeklyReportDownloadButton = dynamic<WeeklyReportDownloadButtonProps>(
  () =>
    import('./components/weekly-report-pdf').then(
      mod => mod.WeeklyReportDownloadButton,
    ),
  {
    ssr: false,
    loading: () => null,
  },
)

type SectionReportingContentProps = {
  sectionName: string
  sprints: WeeklySprint[]
}

function formatDate(date?: string) {
  if (!date) return '—'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function countReportableTasks(sprint?: WeeklySprint) {
  if (!sprint) return 0
  return (sprint.tasks ?? []).filter(task => {
    const workflowStatus = resolveSprintTaskStatus(task, sprint.weekStart)
    const hasDoneStatus =
      workflowStatus === 'delivered' || workflowStatus === 'done'
    const hasSubmission = (task.workSubmissions ?? []).length > 0
    return task.status === 'accepted' || hasDoneStatus || hasSubmission
  }).length
}

function countEvidenceItems(sprint?: WeeklySprint) {
  if (!sprint) return 0
  return (sprint.tasks ?? []).reduce(
    (total, task) => total + (task.workSubmissions ?? []).length,
    0,
  )
}

export function SectionReportingContent({
  sectionName,
  sprints,
}: SectionReportingContentProps) {
  const sortedSprints = React.useMemo(
    () => [...sprints].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    [sprints],
  )
  const [selectedSprintId, setSelectedSprintId] = React.useState(
    sortedSprints[0]?._id ?? '',
  )

  React.useEffect(() => {
    if (sortedSprints.length === 0) {
      setSelectedSprintId('')
      return
    }

    if (!sortedSprints.some(sprint => sprint._id === selectedSprintId)) {
      setSelectedSprintId(sortedSprints[0]._id)
    }
  }, [selectedSprintId, sortedSprints])

  const selectedSprint = React.useMemo(
    () => sortedSprints.find(sprint => sprint._id === selectedSprintId),
    [selectedSprintId, sortedSprints],
  )

  const reportableTaskCount = countReportableTasks(selectedSprint)
  const evidenceItemCount = countEvidenceItems(selectedSprint)

  return (
    <div className='space-y-4'>
      {sortedSprints.length === 0 ? (
        <div className='rounded-lg border border-dashed p-6 text-sm text-muted-foreground'>
          No weekly sprints are available for reporting yet.
        </div>
      ) : (
        <>
          <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end'>
            <div className='space-y-2'>
              <Select
                value={selectedSprintId}
                onValueChange={setSelectedSprintId}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a sprint week' />
                </SelectTrigger>
                <SelectContent>
                  {sortedSprints.map(sprint => (
                    <SelectItem key={sprint._id} value={sprint._id}>
                      {sprint.weekLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSprint ? (
              <WeeklyReportDownloadButton
                sectionName={sectionName}
                sprint={selectedSprint}
              />
            ) : null}
          </div>

          {/* {selectedSprint ? (
                <div className='rounded-lg border bg-muted/20 p-4'>
                  <div className='flex flex-wrap items-center gap-3 text-sm'>
                    <span className='inline-flex items-center gap-2 font-medium'>
                      <CalendarDays className='h-4 w-4 text-muted-foreground' />
                      {formatDate(selectedSprint.weekStart)} –{' '}
                      {formatDate(selectedSprint.weekEnd)}
                    </span>
                    <Badge variant='secondary'>{selectedSprint.status}</Badge>
                    <span className='text-muted-foreground'>
                      Supervisor: {selectedSprint.supervisor?.fullName ?? '—'}
                    </span>
                  </div>
                  <div className='mt-4 grid gap-3 md:grid-cols-4'>
                    <div className='rounded-md bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Column 1</p>
                      <p className='text-sm font-medium'>Initiative</p>
                    </div>
                    <div className='rounded-md bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Column 2</p>
                      <p className='text-sm font-medium'>Measurable activity</p>
                    </div>
                    <div className='rounded-md bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Column 3</p>
                      <p className='text-sm font-medium'>Tasks done</p>
                    </div>
                    <div className='rounded-md bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Column 4</p>
                      <p className='text-sm font-medium'>
                        Work submissions / evidence
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedSprint && reportableTaskCount === 0 ? (
                <div className='flex items-start gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
                  <FileText className='mt-0.5 h-4 w-4 shrink-0' />
                  This sprint has no accepted, delivered, done, or submitted
                  tasks yet. The PDF will still generate with an empty-state
                  row.
                </div>
              ) : null} */}
        </>
      )}
    </div>
  )
}
