'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { AssessmentQuestionReviewStep } from '@/features/assessments/components/assessment-question-review-step'
import { AssessmentResultsReportView } from '@/features/assessments/components/assessment-results-report'
import { AssessmentResultsSummaryNav } from '@/features/assessments/components/assessment-results-summary-nav'
import {
  ScrollMouseIndicator,
  useScrollHintActive,
} from '@/features/assessments/components/scroll-mouse-indicator'
import { assessmentQuestionSlideVariants } from '@/features/assessments/assessment-fullscreen-layout'
import { buildAssessmentResultsReport } from '@/lib/assessments/results-report'
import { isQuestionAnswerCorrect } from '@/lib/assessments/scoring'
import type {
  AssessmentAttemptRecord,
  AssessmentQuestion,
} from '@/lib/assessments/types'

interface AssessmentAttemptReviewViewProps {
  assessmentTitle: string
  officerName?: string
  questions: AssessmentQuestion[]
  attempt: Pick<
    AssessmentAttemptRecord,
    'answers' | 'score' | 'maxScore' | 'percentScore'
  >
  onClose: () => void
}

export function AssessmentAttemptReviewView({
  assessmentTitle,
  officerName,
  questions,
  attempt,
  onClose,
}: AssessmentAttemptReviewViewProps) {
  const [reviewMode, setReviewMode] = React.useState<'summary' | 'questions'>(
    'summary',
  )
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [slideDirection, setSlideDirection] = React.useState(1)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const answers = React.useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const answer of attempt.answers ?? []) {
      map[answer.questionKey] = answer.selectedAnswers ?? []
    }
    return map
  }, [attempt.answers])

  const resultsReport = React.useMemo(
    () =>
      buildAssessmentResultsReport({
        questions,
        answers: attempt.answers ?? [],
      }),
    [attempt.answers, questions],
  )

  const passedQuestions = React.useMemo(
    () => resultsReport.questionOutcomes.filter(outcome => outcome.isCorrect),
    [resultsReport],
  )
  const failedQuestions = React.useMemo(
    () => resultsReport.questionOutcomes.filter(outcome => !outcome.isCorrect),
    [resultsReport],
  )

  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex]
  const progress =
    totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalQuestions - 1

  const { canScrollDown, updateScrollHint } = useScrollHintActive(
    scrollRef,
    currentQuestion?._key ?? currentIndex,
  )

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [currentIndex, currentQuestion?._key])

  function goBack() {
    setSlideDirection(-1)
    setCurrentIndex(index => Math.max(index - 1, 0))
  }

  function goNext() {
    setSlideDirection(1)
    setCurrentIndex(index => Math.min(index + 1, totalQuestions - 1))
  }

  if (reviewMode === 'summary') {
    return (
      <>
        <header className='flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6'>
          <div className='min-w-0 space-y-0.5'>
            <DialogTitle className='truncate text-left text-base font-semibold sm:text-lg'>
              {assessmentTitle}
            </DialogTitle>
            {officerName ? (
              <p className='truncate text-sm text-muted-foreground'>
                {officerName}
              </p>
            ) : null}
          </div>
          <Button type='button' variant='outline' size='sm' onClick={onClose}>
            Close
          </Button>
        </header>

        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6'>
          <AssessmentResultsReportView
            report={resultsReport}
            assessmentTitle={assessmentTitle}
          />
        </div>

        <footer className='flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3 sm:px-6'>
          <Button
            type='button'
            size='sm'
            onClick={() => setReviewMode('questions')}
          >
            Review answers
          </Button>
        </footer>
      </>
    )
  }

  if (!currentQuestion) {
    return (
      <div className='flex flex-1 items-center justify-center p-6'>
        <p className='text-sm text-muted-foreground'>
          This assessment has no questions.
        </p>
      </div>
    )
  }

  return (
    <>
      <header className='flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:px-6'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 space-y-0.5'>
            <DialogTitle className='truncate text-left text-base font-semibold sm:text-lg'>
              {assessmentTitle}
            </DialogTitle>
            {officerName ? (
              <p className='truncate text-sm text-muted-foreground'>
                {officerName}
              </p>
            ) : null}
          </div>
          <Button type='button' variant='outline' size='sm' onClick={onClose}>
            Close
          </Button>
        </div>

        <div className='space-y-2'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-sm font-medium'>
              Score: {attempt.score ?? 0}/{attempt.maxScore ?? 0} (
              {attempt.percentScore ?? 0}%)
            </p>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-xs'
              onClick={() => setReviewMode('summary')}
            >
              Back to report
            </Button>
          </div>
          <AssessmentResultsSummaryNav
            passedQuestions={passedQuestions}
            failedQuestions={failedQuestions}
            currentIndex={currentIndex}
            onSelectQuestion={index => {
              setSlideDirection(index > currentIndex ? 1 : -1)
              setCurrentIndex(index)
            }}
          />
          <p className='text-xs text-muted-foreground'>
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <Progress value={progress} className='h-2' />
        </div>
      </header>

      <div className='relative min-h-0 flex-1'>
        <div
          ref={scrollRef}
          onScroll={updateScrollHint}
          className='h-full overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6'
        >
          <AnimatePresence mode='wait' custom={slideDirection}>
            <motion.div
              key={currentQuestion._key}
              custom={slideDirection}
              variants={assessmentQuestionSlideVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              <AssessmentQuestionReviewStep
                questionNumber={currentIndex + 1}
                question={currentQuestion}
                selectedAnswers={answers[currentQuestion._key] ?? []}
                showResults
                isQuestionCorrect={isQuestionAnswerCorrect(
                  currentQuestion,
                  answers[currentQuestion._key] ?? [],
                )}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <ScrollMouseIndicator visible={canScrollDown} />
      </div>

      <footer className='flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3 sm:px-6'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={goBack}
          disabled={isFirst}
        >
          <ChevronLeft className='mr-1 h-4 w-4' />
          Back
        </Button>
        {!isLast ? (
          <Button type='button' size='sm' onClick={goNext}>
            Next
            <ChevronRight className='ml-1 h-4 w-4' />
          </Button>
        ) : null}
      </footer>
    </>
  )
}
