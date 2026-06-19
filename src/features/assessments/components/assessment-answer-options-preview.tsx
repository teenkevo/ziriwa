import { CheckCircle2, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { AssessmentQuestionOption } from '@/lib/assessments/types'

interface AssessmentAnswerOptionsPreviewProps {
  options: AssessmentQuestionOption[]
  correctAnswers?: string[]
  selectedAnswers?: string[]
}

export function AssessmentAnswerOptionsPreview({
  options,
  correctAnswers = [],
  selectedAnswers,
}: AssessmentAnswerOptionsPreviewProps) {
  const isReview = selectedAnswers != null

  return (
    <ul className='space-y-2'>
      {(options ?? []).map(option => {
        const isCorrect = correctAnswers.includes(option.label)
        const isSelected = selectedAnswers?.includes(option.label) ?? false
        const isWrongSelection = isReview && isSelected && !isCorrect

        return (
          <li
            key={option._key ?? option.label}
            className={cn(
              'flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm',
              isCorrect &&
                'border-emerald-500/70 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-50',
              isWrongSelection && 'border-destructive/70 bg-destructive/10',
              !isCorrect && !isWrongSelection && 'border-border bg-background',
            )}
          >
            <span className='shrink-0 font-medium tabular-nums'>{option.label}.</span>
            <span className='min-w-0 flex-1 leading-relaxed'>{option.text}</span>
            {isCorrect ? (
              <span className='inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300'>
                <CheckCircle2 className='h-4 w-4' aria-hidden='true' />
                <span>Correct</span>
              </span>
            ) : isWrongSelection ? (
              <span className='inline-flex shrink-0 items-center gap-1 text-xs font-medium text-destructive'>
                <XCircle className='h-4 w-4' aria-hidden='true' />
                <span>Your answer</span>
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
