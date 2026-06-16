import Link from 'next/link'
import { FilePenLine, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextContent } from '@/components/ui/rich-text-content'
import { cn } from '@/lib/utils'
import type { AtRiskSprintTask } from '@/lib/section-dashboard-metrics'
import { SprintTaskContractLinkRows } from '@/features/sections/components/sprint-task-contract-link-rows'

interface SprintRevisionTaskCardProps {
  task: AtRiskSprintTask
  reviseHref: string
}

export function SprintRevisionTaskCard({
  task,
  reviseHref,
}: SprintRevisionTaskCardProps) {
  const showRevisionReason = Boolean(task.revisionReason?.trim())

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
            variant='outline'
            className={cn(
              'w-fit px-1.5 py-0 text-[10px]',
              'border-orange-500/50 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
            )}
          >
            Revisions Requested
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
      <div
        className={cn(
          'mt-4 flex items-center gap-3 border-t pt-4',
          showRevisionReason ? 'justify-between' : 'justify-end',
        )}
      >
        {showRevisionReason ? (
          <div className='flex min-w-0 flex-1 items-center rounded-2xl p-2 text-xs'>
            <TriangleAlert
              strokeWidth={1.5}
              className='mr-2 h-6 w-6 shrink-0 text-orange-500'
            />
            <span className='min-w-0'>
              Revisions requested: {task.revisionReason}
            </span>
          </div>
        ) : null}
        <Button type='button' size='sm' className='h-8 shrink-0' asChild>
          <Link href={reviseHref}>
            <FilePenLine className='h-4 w-4' strokeWidth={1.2} />
            Make revisions
          </Link>
        </Button>
      </div>
    </div>
  )
}
