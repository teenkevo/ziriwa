'use client'

import { CheckCircle2, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

interface AssessmentResultsSummaryNavProps {
  passedQuestions: Array<{ index: number }>
  failedQuestions: Array<{ index: number }>
  currentIndex: number
  onSelectQuestion: (index: number) => void
}

export function AssessmentResultsSummaryNav({
  passedQuestions,
  failedQuestions,
  currentIndex,
  onSelectQuestion,
}: AssessmentResultsSummaryNavProps) {
  return (
    <div className='space-y-2 text-xs'>
      <div className='flex flex-wrap items-center gap-1.5'>
        <span className='inline-flex items-center gap-1 font-medium text-emerald-700'>
          <CheckCircle2 className='h-3.5 w-3.5' aria-hidden='true' />
          Passed ({passedQuestions.length})
        </span>
        {passedQuestions.map(outcome => (
          <button
            key={outcome.index}
            type='button'
            onClick={() => onSelectQuestion(outcome.index)}
            className={cn(
              'rounded-md border px-2 py-0.5 font-medium transition-colors',
              outcome.index === currentIndex
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
            )}
          >
            Q{outcome.index + 1}
          </button>
        ))}
        {passedQuestions.length === 0 ? (
          <span className='text-muted-foreground'>None</span>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center gap-1.5'>
        <span className='inline-flex items-center gap-1 font-medium text-destructive'>
          <XCircle className='h-3.5 w-3.5' aria-hidden='true' />
          Failed ({failedQuestions.length})
        </span>
        {failedQuestions.map(outcome => (
          <button
            key={outcome.index}
            type='button'
            onClick={() => onSelectQuestion(outcome.index)}
            className={cn(
              'rounded-md border px-2 py-0.5 font-medium transition-colors',
              outcome.index === currentIndex
                ? 'border-destructive bg-destructive text-destructive-foreground'
                : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15',
            )}
          >
            Q{outcome.index + 1}
          </button>
        ))}
        {failedQuestions.length === 0 ? (
          <span className='text-muted-foreground'>None</span>
        ) : null}
      </div>
    </div>
  )
}
