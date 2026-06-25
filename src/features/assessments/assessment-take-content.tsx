'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { Progress } from '@/components/ui/progress'
import { WorkspaceRouteLoading } from '@/components/workspace-route-loading'
import { useWorkspaceRouteNavigationOptional } from '@/contexts/workspace-route-navigation-context'
import {
  ScrollMouseIndicator,
  useScrollHintActive,
} from '@/features/assessments/components/scroll-mouse-indicator'
import { AssessmentAttemptReviewView } from '@/features/assessments/components/assessment-attempt-review-view'
import { AssessmentQuestionReviewStep } from '@/features/assessments/components/assessment-question-review-step'
import {
  ASSESSMENT_FULLSCREEN_DIALOG_CLASS,
  assessmentQuestionSlideVariants,
} from '@/features/assessments/assessment-fullscreen-layout'
import {
  AssessmentStartCountdown,
  useAssessmentStartCountdown,
} from '@/features/assessments/components/assessment-start-countdown'
import {
  AssessmentTimer,
  useAssessmentTimer,
} from '@/features/assessments/components/assessment-timer'
import {
  formatTimeLimitMinutes,
  isBeforeStartsAt,
  isPastDueDate,
} from '@/lib/assessments/time-limit'
import type {
  AssessmentAttemptRecord,
  AssessmentQuestion,
  AssessmentRecord,
} from '@/lib/assessments/types'

interface AssessmentQuestionResult {
  questionKey: string
  isCorrect: boolean
  correctAnswers?: string[]
  explanation?: string
}

interface AssessmentTakeContentProps {
  basePath: string
  assessment: AssessmentRecord
  existingAttempt: AssessmentAttemptRecord | null
  activeAttempt?: AssessmentAttemptRecord | null
  resultsReleased: boolean
}

export function AssessmentTakeContent({
  basePath,
  assessment,
  existingAttempt,
  activeAttempt: initialActiveAttempt = null,
  resultsReleased,
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
  const [assessmentOpen, setAssessmentOpen] = React.useState(true)
  const [isLeaving, setIsLeaving] = React.useState(false)
  const [reviewQuestions, setReviewQuestions] = React.useState(
    assessment.questions ?? [],
  )

  const questions = reviewQuestions
  const hasTimeLimit = (assessment.timeLimitMinutes ?? 0) > 0
  const isPastDue = isPastDueDate(assessment.dueDate)
  const { hasStarted: hasAssignmentStarted } = useAssessmentStartCountdown(
    assessment.startsAt,
  )
  const hasSubmitted = Boolean(submittedAttempt)
  const showReview = hasSubmitted && resultsReleased
  const showSubmittedPending = hasSubmitted && !resultsReleased
  const showStartsAtGate =
    !hasSubmitted && Boolean(assessment.startsAt) && !hasAssignmentStarted
  const showPreStart =
    !hasSubmitted && !showStartsAtGate && hasTimeLimit && !activeAttempt
  const isSessionReady =
    showReview ||
    showSubmittedPending ||
    (!showStartsAtGate && (!hasTimeLimit || Boolean(activeAttempt)))
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
    if (showReview || showSubmittedPending) {
      handleClose()
      return
    }
    if (!activeAttempt) {
      handleClose()
      return
    }
    setConfirmCloseOpen(true)
  }

  async function confirmAbandonAssessment() {
    setConfirmCloseOpen(false)
    setAssessmentOpen(false)
    setIsLeaving(true)
    setIsSaving(true)
    setActiveAttempt(null)

    try {
      const res = await fetch(`/api/assessments/${assessment._id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map(question => ({
            questionKey: question._key,
            selectedAnswers: answers[question._key] ?? [],
          })),
          submissionReason: 'abandoned',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to abandon assessment')

      toast.success('Assessment abandoned. You received a score of 0.')
      router.refresh()
      navigateToAssessmentsList()
    } catch (error) {
      console.error(error)
      setAssessmentOpen(true)
      setIsLeaving(false)
      setIsSaving(false)
      toast.error(
        error instanceof Error ? error.message : 'Failed to abandon assessment',
      )
    }
  }

  async function handleStartTimedAssessment() {
    if (isPastDue) {
      toast.error('This assessment is past its due date')
      return
    }
    if (isBeforeStartsAt(assessment.startsAt)) {
      toast.error('This assessment has not started yet')
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
  const hasSubmittedRef = React.useRef(hasSubmitted)
  isSavingRef.current = isSaving
  hasSubmittedRef.current = hasSubmitted

  const handleTimerExpire = React.useCallback(() => {
    if (isSavingRef.current || hasSubmittedRef.current) return
    void handleSubmitRef.current({ timedOut: true })
  }, [])

  useAssessmentTimer({
    expiresAt: activeAttempt?.expiresAt,
    enabled:
      Boolean(activeAttempt?.expiresAt) && isSessionReady && !hasSubmitted,
    onExpire: handleTimerExpire,
  })

  React.useEffect(() => {
    if (!activeAttempt || hasSubmitted || isSaving || !hasTimeLimit) return

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
    hasSubmitted,
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
    if (!showReview && !currentQuestionAnswered()) {
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

      if (resultsReleased && Array.isArray(data.questionResults)) {
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
        score: resultsReleased ? data.score : undefined,
        maxScore: resultsReleased ? data.maxScore : undefined,
        percentScore: resultsReleased ? data.percentScore : undefined,
        submittedAt: data.submittedAt ?? new Date().toISOString(),
        submissionReason: data.submissionReason,
      })
      setActiveAttempt(null)
      setSlideDirection(-1)
      setCurrentIndex(0)
      toast.success(
        timedOut
          ? 'Time is up — your assessment was submitted'
          : resultsReleased
            ? 'Assessment submitted'
            : 'Assessment submitted. Your manager will release results when ready.',
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
      <Dialog
        open={assessmentOpen}
        onOpenChange={open => {
          if (!open && !isSaving && !isStarting && !isLeaving) requestClose()
        }}
      >
        <DialogContent
          disableClose={isSaving || isStarting}
          className={ASSESSMENT_FULLSCREEN_DIALOG_CLASS}
        >
          {showStartsAtGate ? (
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
                  This assessment opens soon. You can start once the countdown
                  reaches zero.
                </p>
              </div>
              <AssessmentStartCountdown
                startsAt={assessment.startsAt!}
                showOpensAt
              />
              <Button
                type='button'
                variant='outline'
                onClick={handleClose}
              >
                Back
              </Button>
            </div>
          ) : showSubmittedPending ? (
            <div className='flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center'>
              <div className='max-w-lg space-y-3'>
                <DialogTitle className='text-2xl font-semibold'>
                  Assessment submitted
                </DialogTitle>
                <p className='text-sm text-muted-foreground'>
                  Your answers have been recorded and marked. Your manager will
                  release results when they are ready for you to review.
                </p>
              </div>
              <Button type='button' onClick={handleClose}>
                Back to assessments
              </Button>
            </div>
          ) : showPreStart ? (
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
          ) : showReview && submittedAttempt ? (
            <AssessmentAttemptReviewView
              assessmentTitle={assessment.title}
              questions={questions}
              attempt={submittedAttempt}
              onClose={handleClose}
            />
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
                    {activeAttempt?.expiresAt && !hasSubmitted ? (
                      <AssessmentTimer expiresAt={activeAttempt.expiresAt} />
                    ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={requestClose}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className='space-y-2'>
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
                        showResults={false}
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

                {!isLast ? (
                  <Button
                    type='button'
                    size='sm'
                    onClick={goNext}
                    disabled={isSaving}
                  >
                    Next
                    <ChevronRight className='ml-1 h-4 w-4' />
                  </Button>
                ) : (
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
                )}
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
        <AlertDialogContent disableClose={isLeaving || isSaving}>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              If you abandon and give up, your attempt will be submitted with a
              score of 0. You cannot retake this assessment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving || isSaving}>
              Keep taking assessment
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={isLeaving || isSaving}
              onClick={event => {
                event.preventDefault()
                void confirmAbandonAssessment()
              }}
            >
              {isLeaving || isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Abandon and give up'
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

