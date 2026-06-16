'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { AtRiskSprintTask } from '@/lib/section-dashboard-metrics'
import { SprintPendingReviewTaskCard } from '@/features/sections/components/dashboard/sprint-pending-review-task-card'
import {
  SprintTaskReviewDialog,
  type SprintTaskReviewAction,
} from '@/features/sections/components/dashboard/sprint-task-review-dialog'

interface PendingReviewTasksSectionProps {
  tasks: AtRiskSprintTask[]
}

export function PendingReviewTasksSection({
  tasks,
}: PendingReviewTasksSectionProps) {
  const router = useRouter()
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [reviewingTask, setReviewingTask] =
    React.useState<AtRiskSprintTask | null>(null)
  const [reviewAction, setReviewAction] =
    React.useState<SprintTaskReviewAction | ''>('')
  const [revisionReason, setRevisionReason] = React.useState('')
  const [isReviewing, setIsReviewing] = React.useState(false)

  const openReview = React.useCallback(
    (task: AtRiskSprintTask, action: SprintTaskReviewAction) => {
      setReviewingTask(task)
      setReviewAction(action)
      setRevisionReason(
        action === 'revisions_requested'
          ? (task.revisionReason?.trim() ?? '')
          : '',
      )
      setReviewOpen(true)
    },
    [],
  )

  const handleReview = React.useCallback(async () => {
    if (!reviewingTask || !reviewAction) return
    if (reviewAction === 'revisions_requested' && !revisionReason.trim()) return

    const reviewStatus =
      reviewAction === 'withdraw_revision' ? 'pending' : reviewAction

    setIsReviewing(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${reviewingTask.sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review-task',
          taskKey: reviewingTask._key,
          reviewStatus,
          revisionReason:
            reviewAction === 'revisions_requested'
              ? revisionReason.trim()
              : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to review task',
        )
      }
      if (reviewAction === 'revisions_requested') {
        toast.success('Feedback sent successfully')
      }
      setReviewOpen(false)
      setReviewingTask(null)
      setReviewAction('')
      setRevisionReason('')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to review task')
    } finally {
      setIsReviewing(false)
    }
  }, [reviewAction, reviewingTask, revisionReason, router])

  return (
    <>
      <ul className='space-y-6'>
        {tasks.map(task => (
          <li key={`${task.sprintId}-${task._key}`}>
            <SprintPendingReviewTaskCard
              task={task}
              onReview={action => openReview(task, action)}
            />
          </li>
        ))}
      </ul>

      <SprintTaskReviewDialog
        open={reviewOpen}
        onOpenChange={open => {
          setReviewOpen(open)
          if (!open) {
            setReviewingTask(null)
            setReviewAction('')
            setRevisionReason('')
          }
        }}
        taskDescription={reviewingTask?.description}
        taskStatus='pending'
        action={reviewAction}
        revisionReason={revisionReason}
        onRevisionReasonChange={setRevisionReason}
        isReviewing={isReviewing}
        onConfirm={handleReview}
      />
    </>
  )
}
