import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextContent } from '@/components/ui/rich-text-content'
import { cn } from '@/lib/utils'
import type { AtRiskSprintTask } from '@/lib/section-dashboard-metrics'
import { SprintTaskContractLinkRows } from '@/features/sections/components/sprint-task-contract-link-rows'
import type { SprintTaskReviewAction } from '@/features/sections/components/dashboard/sprint-task-review-dialog'

interface SprintPendingReviewTaskCardProps {
  task: AtRiskSprintTask
  onReview: (action: SprintTaskReviewAction) => void
}

export function SprintPendingReviewTaskCard({
  task,
  onReview,
}: SprintPendingReviewTaskCardProps) {
  return (
    <div className='flex flex-col rounded-md border p-6 shadow-md'>
      {task.sprintWeekLabel ? (
        <p className='mb-3 text-xs font-medium text-muted-foreground'>
          {task.sprintWeekLabel}
        </p>
      ) : null}
      <div className='min-w-0'>
        <div className='mb-4 space-y-5'>
          <Badge
            variant='secondary'
            className={cn(
              'w-fit px-1.5 py-0 text-[10px]',
              'border-orange-500/50 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
            )}
          >
            Pending Review
          </Badge>
          <RichTextContent
            html={task.description}
            className='text-sm'
            emptyText='No description provided.'
          />
        </div>

        <SprintTaskContractLinkRows
          initiativeTitle={task.initiativeTitle}
          activityTitle={task.activityTitle}
          contractTaskTitle={task.contractTaskTitle}
        />
      </div>
      <div className='mt-4 flex items-center justify-end gap-1 border-t pt-4'>
        <Button
          size='sm'
          variant='ghost'
          className='h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700'
          title='Accept'
          onClick={() => onReview('accepted')}
        >
          <CheckCircle2 className='h-4 w-4' />
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='h-7 w-7 p-0 text-orange-500 hover:bg-orange-50 hover:text-orange-600'
          title='Request Revisions'
          onClick={() => onReview('revisions_requested')}
        >
          <RotateCcw className='h-4 w-4' />
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600'
          title='Reject'
          onClick={() => onReview('rejected')}
        >
          <XCircle className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}
