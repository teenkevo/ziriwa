'use client'

import { CheckCircle2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { difficultyLabel } from '@/lib/assessments/scoring'
import type { AssessmentQuestion } from '@/lib/assessments/types'
import { cn } from '@/lib/utils'

interface AssessmentQuestionReviewStepProps {
  questionNumber: number
  question: AssessmentQuestion
  selectedAnswers: string[]
  showResults: boolean
  isQuestionCorrect?: boolean
  onSingleChange?: (value: string) => void
  onMultipleChange?: (value: string, checked: boolean) => void
}

export function AssessmentQuestionReviewStep({
  questionNumber,
  question,
  selectedAnswers,
  showResults,
  isQuestionCorrect,
  onSingleChange,
  onMultipleChange,
}: AssessmentQuestionReviewStepProps) {
  const isMultiple = question.questionType === 'multiple_choice'
  const correctAnswers = question.correctAnswers ?? []

  function optionClassName(optionLabel: string, isSelected: boolean) {
    if (!showResults) {
      return cn(isSelected && 'border-primary bg-muted/40')
    }

    const isCorrectOption = correctAnswers.includes(optionLabel)
    const isWrongSelection = isSelected && !isCorrectOption

    return cn(
      isCorrectOption &&
        'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-50',
      isWrongSelection &&
        'border-destructive bg-destructive/10 text-destructive',
    )
  }

  const answerOptions = !isMultiple ? (
    <RadioGroup
      value={selectedAnswers[0] ?? ''}
      onValueChange={onSingleChange}
      disabled={showResults}
      className='space-y-3'
    >
      {(question.options ?? []).map(option => {
        const isSelected = selectedAnswers[0] === option.label
        return (
          <div
            key={option._key ?? option.label}
            className={cn(
              'flex items-start gap-3 rounded-md border p-3',
              !showResults &&
                'has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40',
              optionClassName(option.label, isSelected),
            )}
          >
            <RadioGroupItem
              value={option.label}
              id={`${question._key}-${option.label}`}
              className='mt-0.5'
            />
            <Label
              htmlFor={`${question._key}-${option.label}`}
              className='cursor-pointer text-sm font-normal leading-relaxed'
            >
              <span className='font-medium'>{option.label}.</span> {option.text}
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  ) : (
    <div className='space-y-3'>
      {(question.options ?? []).map(option => {
        const checked = selectedAnswers.includes(option.label)
        return (
          <div
            key={option._key ?? option.label}
            className={cn(
              'flex items-start gap-3 rounded-md border p-3',
              optionClassName(option.label, checked),
            )}
          >
            <Checkbox
              id={`${question._key}-${option.label}`}
              checked={checked}
              onCheckedChange={value =>
                onMultipleChange?.(option.label, value === true)
              }
              disabled={showResults}
              className='mt-0.5'
            />
            <Label
              htmlFor={`${question._key}-${option.label}`}
              className='cursor-pointer text-sm font-normal leading-relaxed'
            >
              <span className='font-medium'>{option.label}.</span> {option.text}
            </Label>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col gap-6 md:min-h-[min(420px,55vh)] md:flex-row md:items-stretch md:gap-0'>
      <div className='flex min-w-0 flex-1 flex-col gap-3 md:pr-6'>
        <div className='flex flex-wrap items-center gap-2'>
          <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground md:text-2xl'>
            Question {questionNumber}
          </p>
          {question.subtopic ? (
            <Badge variant='outline'>{question.subtopic}</Badge>
          ) : null}
          {question.difficulty ? (
            <Badge variant='secondary'>
              {difficultyLabel(question.difficulty)}
            </Badge>
          ) : null}
          {showResults && isQuestionCorrect != null ? (
            <Badge
              variant='outline'
              className={cn(
                'gap-1',
                isQuestionCorrect
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-destructive bg-destructive/10 text-destructive',
              )}
            >
              {isQuestionCorrect ? (
                <CheckCircle2 className='h-3 w-3' aria-hidden='true' />
              ) : (
                <XCircle className='h-3 w-3' aria-hidden='true' />
              )}
              {isQuestionCorrect ? 'Passed' : 'Failed'}
            </Badge>
          ) : null}
        </div>
        <p className='text-sm leading-relaxed whitespace-pre-wrap'>
          {question.body}
        </p>
        {showResults && question.explanation ? (
          <p className='rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
            <span className='font-medium text-foreground'>Explanation: </span>
            {question.explanation}
          </p>
        ) : null}
      </div>

      <Separator className='md:hidden' />
      <Separator orientation='vertical' className='hidden md:block' />

      <div className='flex min-w-0 flex-1 flex-col md:pl-6'>{answerOptions}</div>
    </div>
  )
}
