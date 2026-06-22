'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { WorkspaceRouteLoading } from '@/components/workspace-route-loading'
import { useWorkspaceRouteNavigationOptional } from '@/contexts/workspace-route-navigation-context'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { AssessmentAnswerOptionsPreview } from '@/features/assessments/components/assessment-answer-options-preview'
import {
  ASSESSMENT_FULLSCREEN_DIALOG_CLASS,
  assessmentQuestionSlideVariants,
} from '@/features/assessments/assessment-fullscreen-layout'
import {
  ScrollMouseIndicator,
  useScrollHintActive,
} from '@/features/assessments/components/scroll-mouse-indicator'
import { PublishAssessmentDialog } from '@/features/assessments/components/publish-assessment-dialog'
import { AssessmentOfficerSubmissionsSheet } from '@/features/assessments/components/assessment-officer-submissions-sheet'
import { assessmentStatusLabel } from '@/lib/assessments/scoring'
import { areAssessmentResultsReleased } from '@/lib/assessments/results-release'
import { cn } from '@/lib/utils'
import type {
  AssessmentAttemptRecord,
  AssessmentOfficerSubmissionRow,
  AssessmentQuestion,
  AssessmentRecord,
} from '@/lib/assessments/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const

interface AssessmentManageContentProps {
  role: 'manager' | 'supervisor'
  basePath: string
  dashboardHref: string
  assessment: AssessmentRecord
  attempts: AssessmentAttemptRecord[]
  officerSubmissions: AssessmentOfficerSubmissionRow[]
  canManage: boolean
}

export function AssessmentManageContent({
  role,
  basePath,
  dashboardHref,
  assessment,
  attempts,
  officerSubmissions,
  canManage,
}: AssessmentManageContentProps) {
  const router = useRouter()
  const navigation = useWorkspaceRouteNavigationOptional()
  const [questions, setQuestions] = React.useState<AssessmentQuestion[]>(
    assessment.questions ?? [],
  )
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [slideDirection, setSlideDirection] = React.useState(1)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isLeaving, setIsLeaving] = React.useState(false)
  const [submissionsOpen, setSubmissionsOpen] = React.useState(false)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [publishQuestions, setPublishQuestions] = React.useState<
    AssessmentQuestion[]
  >([])
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)

  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex]
  const progress =
    totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalQuestions - 1
  const resultsReleased = areAssessmentResultsReleased(assessment)
  const canReleaseResults =
    canManage &&
    assessment.status === 'published' &&
    attempts.length > 0 &&
    !resultsReleased
  const submittedCount = officerSubmissions.filter(
    row => row.status === 'submitted',
  ).length
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { canScrollDown, updateScrollHint } = useScrollHintActive(
    scrollRef,
    currentQuestion?._key ?? currentIndex,
  )

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        {
          label: role.charAt(0).toUpperCase() + role.slice(1),
          href: dashboardHref,
        },
        { label: 'Assessments', href: basePath },
        { label: assessment.title },
      ],
      [assessment.title, basePath, dashboardHref, role],
    ),
  )

  React.useEffect(() => {
    setQuestions(assessment.questions ?? [])
    setIsDirty(false)
  }, [assessment.questions])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [currentIndex, currentQuestion?._key])

  function updateQuestion(index: number, patch: Partial<AssessmentQuestion>) {
    setIsDirty(true)
    setQuestions(current =>
      current.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    )
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    text: string,
  ) {
    setIsDirty(true)
    setQuestions(current =>
      current.map((question, i) => {
        if (i !== questionIndex) return question
        const options = [...(question.options ?? [])]
        const existing = options[optionIndex]
        if (!existing) return question
        options[optionIndex] = { ...existing, text }
        return { ...question, options }
      }),
    )
  }

  function toggleCorrectAnswer(questionIndex: number, label: string) {
    setIsDirty(true)
    setQuestions(current =>
      current.map((question, i) => {
        if (i !== questionIndex) return question
        const isMultiple = question.questionType === 'multiple_choice'
        const currentAnswers = question.correctAnswers ?? []
        const hasLabel = currentAnswers.includes(label)
        let nextAnswers: string[]
        if (isMultiple) {
          nextAnswers = hasLabel
            ? currentAnswers.filter(value => value !== label)
            : [...currentAnswers, label]
        } else {
          nextAnswers = [label]
        }
        return {
          ...question,
          correctAnswers: [...new Set(nextAnswers)].sort(),
        }
      }),
    )
  }

  function validateQuestions(): AssessmentQuestion[] | null {
    const sanitized: AssessmentQuestion[] = []

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index]
      const options = (question.options ?? []).filter(option => option.text.trim())
      if (!question.body.trim()) {
        toast.error(`Question ${index + 1}: question text is required`)
        return null
      }
      if (options.length < 2) {
        toast.error(`Question ${index + 1}: add at least two options`)
        return null
      }
      if ((question.correctAnswers ?? []).length === 0) {
        toast.error(`Question ${index + 1}: mark at least one correct answer`)
        return null
      }
      if (
        question.questionType === 'single_choice' &&
        (question.correctAnswers ?? []).length !== 1
      ) {
        toast.error(`Question ${index + 1}: mark exactly one correct answer`)
        return null
      }

      sanitized.push({
        ...question,
        title: question.title.trim() || `Question ${index + 1}`,
        body: question.body.trim(),
        options,
        correctAnswers: [...new Set(question.correctAnswers ?? [])].sort(),
        explanation: question.explanation?.trim() || undefined,
      })
    }

    return sanitized
  }

  function handleOpenPublishDialog() {
    const sanitized = validateQuestions()
    if (!sanitized) return
    setPublishQuestions(sanitized)
    setPublishOpen(true)
  }

  function handlePublished() {
    setPublishOpen(false)
    setIsDirty(false)
    toast.success('Assessment published')
    navigateToList()
  }

  async function patchAssessment(body: Record<string, unknown>) {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      toast.success('Assessment updated')
      setIsDirty(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveQuestions() {
    const sanitized = validateQuestions()
    if (!sanitized) return
    await patchAssessment({ questions: sanitized })
  }

  async function handleDelete() {
    if (!window.confirm('Delete this assessment? This cannot be undone.')) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessment._id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      toast.success('Assessment deleted')
      navigateToList()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReleaseResults() {
    if (
      !window.confirm(
        'Release results to officers? They will be able to view their scores and feedback.',
      )
    ) {
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'releaseResults' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to release results')
      toast.success('Results released to officers')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to release results',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function navigateToList() {
    setIsLeaving(true)
    if (navigation) {
      navigation.navigateToHref(basePath)
      return
    }
    router.push(basePath)
  }

  function handleClose() {
    if (canManage && isDirty) {
      const leave = window.confirm(
        'You have unsaved changes. Leave without saving?',
      )
      if (!leave) return
    }
    navigateToList()
  }

  function goBack() {
    setSlideDirection(-1)
    setCurrentIndex(index => Math.max(index - 1, 0))
  }

  function goNext() {
    setSlideDirection(1)
    setCurrentIndex(index => Math.min(index + 1, totalQuestions - 1))
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={open =>
          !open &&
          !isSaving &&
          !isPublishing &&
          !publishOpen &&
          handleClose()
        }
      >
        <DialogContent
          disableClose={isSaving || isPublishing}
          className={ASSESSMENT_FULLSCREEN_DIALOG_CLASS}
        >
          {!currentQuestion ? (
            <div className='flex flex-1 items-center justify-center p-6'>
              <p className='text-sm text-muted-foreground'>
                This assessment has no questions.
              </p>
            </div>
          ) : (
            <>
              <header className='flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:px-6'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <DialogTitle className='min-w-0 truncate text-left text-base font-semibold sm:text-lg'>
                        {assessment.title}
                      </DialogTitle>
                      <Badge variant='outline'>
                        {assessmentStatusLabel(assessment.status)}
                      </Badge>
                    </div>
                    {canManage && isDirty ? (
                      <p className='text-xs text-amber-700'>Unsaved changes</p>
                    ) : null}
                  </div>
                  <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setSubmissionsOpen(true)}
                    >
                      <Users className='mr-1.5 h-4 w-4' />
                      Submissions ({submittedCount}/{officerSubmissions.length})
                    </Button>
                    {canReleaseResults ? (
                      <Button
                        type='button'
                        size='sm'
                        onClick={() => void handleReleaseResults()}
                        disabled={isSaving}
                      >
                        Release results
                      </Button>
                    ) : resultsReleased && assessment.status === 'published' ? (
                      <Badge variant='outline' className='h-8 px-2.5'>
                        Results released
                      </Badge>
                    ) : null}
                    {canManage ? (
                      <>
                        {assessment.status === 'draft' ? (
                          <Button
                            type='button'
                            size='sm'
                            onClick={handleOpenPublishDialog}
                            disabled={isSaving || isPublishing}
                          >
                            Publish
                          </Button>
                        ) : null}
                        {assessment.status === 'published' ? (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              patchAssessment({ action: 'unpublish' })
                            }
                            disabled={isSaving}
                          >
                            Unpublish
                          </Button>
                        ) : null}
                        <Button
                          type='button'
                          size='sm'
                          onClick={handleSaveQuestions}
                          disabled={isSaving || !isDirty}
                        >
                          {isSaving ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          className='h-8 w-8'
                          onClick={handleDelete}
                          disabled={isSaving}
                          aria-label='Delete assessment'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleClose}
                      disabled={isSaving}
                    >
                      Close
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
                      {canManage ? (
                        <ManagerQuestionStep
                          questionNumber={currentIndex + 1}
                          question={currentQuestion}
                          onBodyChange={body =>
                            updateQuestion(currentIndex, { body })
                          }
                          onExplanationChange={explanation =>
                            updateQuestion(currentIndex, { explanation })
                          }
                          onQuestionTypeChange={checked =>
                            updateQuestion(currentIndex, {
                              questionType: checked
                                ? 'multiple_choice'
                                : 'single_choice',
                              correctAnswers: [],
                            })
                          }
                          onOptionChange={(optionIndex, text) =>
                            updateOption(currentIndex, optionIndex, text)
                          }
                          onToggleCorrect={label =>
                            toggleCorrectAnswer(currentIndex, label)
                          }
                          disabled={isSaving}
                        />
                      ) : (
                        <PreviewQuestionStep
                          questionNumber={currentIndex + 1}
                          question={currentQuestion}
                        />
                      )}
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
                ) : null}
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AssessmentOfficerSubmissionsSheet
        open={submissionsOpen}
        onOpenChange={setSubmissionsOpen}
        assessmentTitle={assessment.title}
        rows={officerSubmissions}
        resultsReleased={resultsReleased}
        canReleaseResults={canReleaseResults}
        isReleasing={isSaving}
        onReleaseResults={() => void handleReleaseResults()}
      />

      <PublishAssessmentDialog
        assessmentId={assessment._id}
        assessmentTitle={assessment.title}
        questions={publishQuestions}
        initialStartsAt={assessment.startsAt}
        initialTimeLimitMinutes={assessment.timeLimitMinutes}
        open={publishOpen}
        onOpenChange={setPublishOpen}
        onPublished={handlePublished}
        onPublishingChange={setIsPublishing}
      />

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

function PreviewQuestionStep({
  questionNumber,
  question,
}: {
  questionNumber: number
  question: AssessmentQuestion
}) {
  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col gap-6 md:min-h-[min(420px,55vh)] md:flex-row md:items-stretch md:gap-0'>
      <div className='flex min-w-0 flex-1 flex-col gap-3 md:pr-6'>
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground md:text-2xl'>
          Question {questionNumber}
        </p>
        <p className='text-sm leading-relaxed whitespace-pre-wrap'>
          {question.body}
        </p>
        {question.explanation ? (
          <p className='rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
            <span className='font-medium text-foreground'>Explanation: </span>
            {question.explanation}
          </p>
        ) : null}
      </div>

      <Separator className='md:hidden' />
      <Separator orientation='vertical' className='hidden md:block' />

      <div className='flex min-w-0 flex-1 flex-col md:pl-6'>
        <AssessmentAnswerOptionsPreview
          options={question.options ?? []}
          correctAnswers={question.correctAnswers}
        />
      </div>
    </div>
  )
}

function ManagerQuestionStep({
  questionNumber,
  question,
  onBodyChange,
  onExplanationChange,
  onQuestionTypeChange,
  onOptionChange,
  onToggleCorrect,
  disabled,
}: {
  questionNumber: number
  question: AssessmentQuestion
  onBodyChange: (body: string) => void
  onExplanationChange: (explanation: string) => void
  onQuestionTypeChange: (multiple: boolean) => void
  onOptionChange: (optionIndex: number, text: string) => void
  onToggleCorrect: (label: string) => void
  disabled: boolean
}) {
  return (
    <div className='mx-auto flex w-full max-w-6xl flex-col gap-6 md:min-h-[min(420px,55vh)] md:flex-row md:items-stretch md:gap-0'>
      <div className='flex min-w-0 flex-1 flex-col gap-4 md:pr-6'>
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground md:text-2xl'>
          Question {questionNumber}
        </p>
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>Question</Label>
          <Textarea
            value={question.body}
            onChange={event => onBodyChange(event.target.value)}
            rows={6}
            disabled={disabled}
            className='min-h-[140px] resize-y text-sm leading-relaxed'
          />
        </div>
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>
            Explanation (shown to officers after they submit)
          </Label>
          <Textarea
            value={question.explanation ?? ''}
            onChange={event => onExplanationChange(event.target.value)}
            rows={4}
            disabled={disabled}
            placeholder='Why the correct answer is right…'
            className='resize-y text-sm'
          />
        </div>
      </div>

      <Separator className='md:hidden' />
      <Separator orientation='vertical' className='hidden md:block' />

      <div className='flex min-w-0 flex-1 flex-col gap-4 md:pl-6'>
        <div className='flex items-center justify-between gap-3 rounded-md border p-3'>
          <div>
            <p className='text-sm font-medium'>Multiple correct answers</p>
            <p className='text-xs text-muted-foreground'>
              Officers can select more than one option.
            </p>
          </div>
          <Switch
            checked={question.questionType === 'multiple_choice'}
            onCheckedChange={onQuestionTypeChange}
            disabled={disabled}
          />
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>
            Answers (tap a letter to mark correct)
          </Label>
          <div className='space-y-3'>
            {OPTION_LABELS.map((label, optionIndex) => {
              const option = question.options?.[optionIndex]
              if (!option) return null
              const isCorrect = (question.correctAnswers ?? []).includes(label)
              return (
                <div
                  key={label}
                  className={cn(
                    'flex items-start gap-3 rounded-md border p-3',
                    isCorrect &&
                      'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20',
                  )}
                >
                  <Button
                    type='button'
                    size='sm'
                    variant={isCorrect ? 'default' : 'outline'}
                    className='mt-0.5 h-8 w-8 shrink-0 p-0'
                    onClick={() => onToggleCorrect(label)}
                    disabled={disabled}
                  >
                    {label}
                  </Button>
                  <Textarea
                    value={option.text}
                    onChange={event =>
                      onOptionChange(optionIndex, event.target.value)
                    }
                    rows={2}
                    placeholder={`Option ${label}`}
                    disabled={disabled}
                    className='min-h-[60px] resize-y border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0'
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
