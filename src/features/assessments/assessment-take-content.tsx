'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { WorkspaceRouteLoading } from '@/components/workspace-route-loading'
import { useWorkspaceRouteNavigationOptional } from '@/contexts/workspace-route-navigation-context'
import { cn } from '@/lib/utils'
import {
  ScrollMouseIndicator,
  useScrollHintActive,
} from '@/features/assessments/components/scroll-mouse-indicator'
import { AssessmentAnswerOptionsPreview } from '@/features/assessments/components/assessment-answer-options-preview'
import {
  AssessmentTimer,
  useAssessmentTimer,
} from '@/features/assessments/components/assessment-timer'
import { isQuestionAnswerCorrect } from '@/lib/assessments/scoring'
import {
  formatTimeLimitMinutes,
  isPastDueDate,
} from '@/lib/assessments/time-limit'
import type {
  AssessmentAttemptRecord,
  AssessmentQuestion,
  AssessmentRecord,
} from '@/lib/assessments/types'

const FULLSCREEN_DIALOG_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden rounded-xl p-0',
  '!fixed !inset-3 !bottom-3 !left-3 !right-3 !top-3',
  '!h-auto !max-h-none !w-auto !max-w-none',
  '!translate-x-0 !translate-y-0',
  'sm:!inset-4',
  '[&>button.absolute]:hidden',
)

interface AssessmentQuestionResult {
  questionKey: string
  isCorrect: boolean
  correctAnswers?: string[]
  explanation?: string
}

const questionSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
}

interface AssessmentTakeContentProps {
  basePath: string
  assessment: AssessmentRecord
  existingAttempt: AssessmentAttemptRecord | null
  activeAttempt?: AssessmentAttemptRecord | null
}

export function AssessmentTakeContent({
  basePath,
  assessment,
  existingAttempt,
  activeAttempt: initialActiveAttempt = null,
}: AssessmentTakeContentProps) {
  const router = useRouter()
  const navigation = useWorkspaceRouteNavigationOptional()
  const [answers, setAnswers] = React.useState<Record<string, string[]>>({})
  const [submittedAttempt, setSubmittedAttempt] =
    React.useState<AssessmentAttemptRecord | null>(existingAttempt)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [slideDirection, setSlideDirection] = React.useState(1)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isStarting, setIsStarting] = React.useState(false)
  const [activeAttempt, setActiveAttempt] =
    React.useState<AssessmentAttemptRecord | null>(initialActiveAttempt)
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false)
  const [isLeaving, setIsLeaving] = React.useState(false)
  const [reviewQuestions, setReviewQuestions] = React.useState(
    assessment.questions ?? [],
  )

  const questions = reviewQuestions
  const hasTimeLimit = (assessment.timeLimitMinutes ?? 0) > 0
  const isPastDue = isPastDueDate(assessment.dueDate)
  const showResults = Boolean(submittedAttempt)
  const isSessionReady = showResults || !hasTimeLimit || Boolean(activeAttempt)
  const showPreStart = !showResults && hasTimeLimit && !activeAttempt
  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex]
  const progress =
    totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalQuestions - 1
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { canScrollDown, updateScrollHint } = useScrollHintActive(
    scrollRef,
    currentQuestion?._key ?? currentIndex,
  )

  React.useEffect(() => {
    setReviewQuestions(assessment.questions ?? [])
  }, [assessment.questions])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [currentIndex, currentQuestion?._key])

  React.useEffect(() => {
    setActiveAttempt(initialActiveAttempt)
  }, [initialActiveAttempt])

  React.useEffect(() => {
    if (existingAttempt) setSubmittedAttempt(existingAttempt)
  }, [existingAttempt])

  React.useEffect(() => {
    const attemptAnswers = activeAttempt?.answers ?? existingAttempt?.answers
    if (!attemptAnswers?.length) return
    const initial: Record<string, string[]> = {}
    for (const answer of attemptAnswers) {
      initial[answer.questionKey] = answer.selectedAnswers ?? []
    }
    setAnswers(initial)
  }, [activeAttempt, existingAttempt])

  function navigateToAssessmentsList() {
    setIsLeaving(true)
    if (navigation) {
      navigation.navigateToHref(basePath)
      return
    }
    router.push(basePath)
  }

  function handleClose() {
    navigateToAssessmentsList()
  }

  function requestClose() {
    if (showResults) {
      handleClose()
      return
    }
    setConfirmCloseOpen(true)
  }

  function confirmLeaveAssessment() {
    setConfirmCloseOpen(false)
    navigateToAssessmentsList()
  }

  async function handleStartTimedAssessment() {
    if (isPastDue) {
      toast.error('This assessment is past its due date')
      return
    }

    setIsStarting(true)
    try {
      const res = await fetch(
        `/api/assessments/${assessment._id}/attempt/start`,
        { method: 'POST' },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to start assessment')

      setActiveAttempt(data.attempt ?? null)
      if (Array.isArray(data.attempt?.answers)) {
        const initial: Record<string, string[]> = {}
        for (const answer of data.attempt.answers) {
          initial[answer.questionKey] = answer.selectedAnswers ?? []
        }
        setAnswers(initial)
      }
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to start assessment',
      )
    } finally {
      setIsStarting(false)
    }
  }

  const handleSubmitRef = React.useRef<
    (options?: { timedOut?: boolean }) => Promise<void>
  >(async () => {})
  const isSavingRef = React.useRef(isSaving)
  const showResultsRef = React.useRef(showResults)
  isSavingRef.current = isSaving
  showResultsRef.current = showResults

  const handleTimerExpire = React.useCallback(() => {
    if (isSavingRef.current || showResultsRef.current) return
    void handleSubmitRef.current({ timedOut: true })
  }, [])

  useAssessmentTimer({
    expiresAt: activeAttempt?.expiresAt,
    enabled:
      Boolean(activeAttempt?.expiresAt) && isSessionReady && !showResults,
    onExpire: handleTimerExpire,
  })

  React.useEffect(() => {
    if (!activeAttempt || showResults || isSaving || !hasTimeLimit) return

    const timeout = window.setTimeout(() => {
      void fetch(`/api/assessments/${assessment._id}/attempt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map(question => ({
            questionKey: question._key,
            selectedAnswers: answers[question._key] ?? [],
          })),
        }),
      })
    }, 1_500)

    return () => window.clearTimeout(timeout)
  }, [
    activeAttempt,
    answers,
    assessment._id,
    hasTimeLimit,
    isSaving,
    questions,
    showResults,
  ])

  function setSingleAnswer(questionKey: string, value: string) {
    setAnswers(current => ({ ...current, [questionKey]: [value] }))
  }

  function toggleMultipleAnswer(
    questionKey: string,
    value: string,
    checked: boolean,
  ) {
    setAnswers(current => {
      const existing = current[questionKey] ?? []
      const next = checked
        ? [...new Set([...existing, value])]
        : existing.filter(item => item !== value)
      return { ...current, [questionKey]: next }
    })
  }

  function currentQuestionAnswered(): boolean {
    if (!currentQuestion) return false
    return (answers[currentQuestion._key] ?? []).length > 0
  }

  function goBack() {
    setSlideDirection(-1)
    setCurrentIndex(index => Math.max(index - 1, 0))
  }

  function goNext() {
    if (!showResults && !currentQuestionAnswered()) {
      toast.error('Select an answer to continue')
      return
    }
    setSlideDirection(1)
    setCurrentIndex(index => Math.min(index + 1, totalQuestions - 1))
  }

  async function handleSubmit(options?: { timedOut?: boolean }) {
    const timedOut = options?.timedOut ?? false

    if (!timedOut && !currentQuestionAnswered()) {
      toast.error('Select an answer to continue')
      return
    }

    if (!timedOut) {
      const unanswered = questions.filter(
        question => (answers[question._key] ?? []).length === 0,
      )
      if (unanswered.length > 0) {
        toast.error('Please answer every question before submitting')
        return
      }
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessment._id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map(question => ({
            questionKey: question._key,
            selectedAnswers: answers[question._key] ?? [],
          })),
          submissionReason: timedOut ? 'timeout' : 'manual',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')

      if (Array.isArray(data.questionResults)) {
        const resultsByKey = new Map(
          (data.questionResults as AssessmentQuestionResult[]).map(result => [
            result.questionKey,
            result,
          ]),
        )
        setReviewQuestions(current =>
          current.map(question => {
            const result = resultsByKey.get(question._key)
            if (!result) return question
            return {
              ...question,
              correctAnswers: result.correctAnswers ?? question.correctAnswers,
              explanation: result.explanation ?? question.explanation,
            }
          }),
        )
      }

      setSubmittedAttempt({
        _id: data.id,
        assessmentId: assessment._id,
        answers: questions.map(question => ({
          questionKey: question._key,
          selectedAnswers: answers[question._key] ?? [],
        })),
        score: data.score,
        maxScore: data.maxScore,
        percentScore: data.percentScore,
        submittedAt: data.submittedAt ?? new Date().toISOString(),
        submissionReason: data.submissionReason,
      })
      setActiveAttempt(null)
      setSlideDirection(-1)
      setCurrentIndex(0)
      toast.success(
        timedOut ? 'Time is up — your assessment was submitted' : 'Assessment submitted',
      )
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Submission failed')
    } finally {
      setIsSaving(false)
    }
  }

  handleSubmitRef.current = handleSubmit

  return (
    <>
      <Dialog open onOpenChange={open => !open && !isSaving && requestClose()}>
        <DialogContent
          disableClose={isSaving || isStarting}
          className={FULLSCREEN_DIALOG_CLASS}
        >
          {showPreStart ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center'>
              <div className='max-w-lg space-y-3'>
                <DialogTitle className='text-2xl font-semibold'>
                  {assessment.title}
                </DialogTitle>
                {assessment.description ? (
                  <p className='text-sm text-muted-foreground'>
                    {assessment.description}
                  </p>
                ) : null}
                <p className='text-sm text-muted-foreground'>
                  You will have{' '}
                  <span className='font-medium text-foreground'>
                    {formatTimeLimitMinutes(assessment.timeLimitMinutes ?? 0)}
                  </span>{' '}
                  to complete this assessment once you start. The timer cannot be
                  paused.
                </p>
                {isPastDue ? (
                  <p className='text-sm font-medium text-destructive'>
                    This assessment is past its due date.
                  </p>
                ) : null}
              </div>
              <div className='flex flex-wrap justify-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleClose}
                  disabled={isStarting}
                >
                  Back
                </Button>
                <Button
                  type='button'
                  onClick={handleStartTimedAssessment}
                  disabled={isStarting || isPastDue}
                >
                  {isStarting ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Start assessment'
                  )}
                </Button>
              </div>
            </div>
          ) : !currentQuestion ? (
            <div className='flex flex-1 items-center justify-center p-6'>
              <p className='text-sm text-muted-foreground'>
                This assessment has no questions.
              </p>
            </div>
          ) : (
            <>
              <header className='flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:px-6'>
                <div className='flex items-start justify-between gap-3'>
                  <DialogTitle className='min-w-0 truncate text-left text-base font-semibold sm:text-lg'>
                    {assessment.title}
                  </DialogTitle>
                  <div className='flex shrink-0 items-center gap-2'>
                    {activeAttempt?.expiresAt && !showResults ? (
                      <AssessmentTimer expiresAt={activeAttempt.expiresAt} />
                    ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={requestClose}
                      disabled={isSaving}
                    >
                      {showResults ? 'Close' : 'Cancel'}
                    </Button>
                  </div>
                </div>

                <div className='space-y-2'>
                  {showResults && submittedAttempt ? (
                    <p className='text-sm font-medium'>
                      Score: {submittedAttempt.score ?? 0}/
                      {submittedAttempt.maxScore ?? 0} (
                      {submittedAttempt.percentScore ?? 0}%)
                    </p>
                  ) : null}
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
                      variants={questionSlideVariants}
                      initial='enter'
                      animate='center'
                      exit='exit'
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <QuestionStep
                        questionNumber={currentIndex + 1}
                        question={currentQuestion}
                        selectedAnswers={answers[currentQuestion._key] ?? []}
                        showResults={showResults}
                        isQuestionCorrect={
                          showResults
                            ? isQuestionAnswerCorrect(
                                currentQuestion,
                                answers[currentQuestion._key] ?? [],
                              )
                            : undefined
                        }
                        onSingleChange={value =>
                          setSingleAnswer(currentQuestion._key, value)
                        }
                        onMultipleChange={(value, checked) =>
                          toggleMultipleAnswer(
                            currentQuestion._key,
                            value,
                            checked,
                          )
                        }
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
                  disabled={isFirst || isSaving}
                >
                  <ChevronLeft className='mr-1 h-4 w-4' />
                  Back
                </Button>

                {!showResults && isLast ? (
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => void handleSubmit()}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      'Submit'
                    )}
                  </Button>
                ) : !isLast ? (
                  <Button
                    type='button'
                    size='sm'
                    onClick={goNext}
                    disabled={isSaving}
                  >
                    Next
                    <ChevronRight className='ml-1 h-4 w-4' />
                  </Button>
                ) : null}
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmCloseOpen}
        onOpenChange={open => {
          if (isLeaving) return
          setConfirmCloseOpen(open)
        }}
      >
        <AlertDialogContent disableClose={isLeaving}>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be saved. You will need to start the
              assessment again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>
              Keep taking assessment
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={isLeaving}
              onClick={confirmLeaveAssessment}
            >
              {isLeaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Leave assessment'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLeaving ? (
        <div
          className='fixed inset-0 z-[60] flex items-center justify-center bg-background'
          role='status'
          aria-live='polite'
          aria-busy='true'
        >
          <WorkspaceRouteLoading />
        </div>
      ) : null}
    </>
  )
}

function ResultsSummary({
  passedQuestions,
  failedQuestions,
  currentIndex,
  onSelectQuestion,
}: {
  passedQuestions: Array<{ index: number }>
  failedQuestions: Array<{ index: number }>
  currentIndex: number
  onSelectQuestion: (index: number) => void
}) {
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

function QuestionStep({
  questionNumber,
  question,
  selectedAnswers,
  showResults,
  isQuestionCorrect,
  onSingleChange,
  onMultipleChange,
}: {
  questionNumber: number
  question: AssessmentQuestion
  selectedAnswers: string[]
  showResults: boolean
  isQuestionCorrect?: boolean
  onSingleChange: (value: string) => void
  onMultipleChange: (value: string, checked: boolean) => void
}) {
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
                onMultipleChange(option.label, value === true)
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

      <div className='flex min-w-0 flex-1 flex-col md:pl-6'>
        {answerOptions}
      </div>
    </div>
  )
}
