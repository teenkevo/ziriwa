'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { Progress } from '@/components/ui/progress'
import type { AssessmentQuestion } from '@/lib/assessments/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const

function emptyQuestion(): AssessmentQuestion {
  return {
    _key: crypto.randomUUID(),
    questionType: 'single_choice',
    difficulty: 'intermediate',
    title: '',
    body: '',
    options: [
      { _key: crypto.randomUUID(), label: 'A', text: '' },
      { _key: crypto.randomUUID(), label: 'B', text: '' },
    ],
    correctAnswers: [],
  }
}

interface CreateAssessmentContentProps {
  sectionId: string
  basePath: string
  dashboardHref: string
}

export function CreateAssessmentContent({
  sectionId,
  basePath,
  dashboardHref,
}: CreateAssessmentContentProps) {
  const router = useRouter()
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [timeLimitMinutes, setTimeLimitMinutes] = React.useState('')
  const [publish, setPublish] = React.useState(false)
  const [questions, setQuestions] = React.useState<AssessmentQuestion[]>([
    emptyQuestion(),
  ])
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [isSaving, setIsSaving] = React.useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const questionProgress =
    questions.length > 0
      ? ((currentQuestionIndex + 1) / questions.length) * 100
      : 0

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        { label: 'Manager', href: dashboardHref },
        { label: 'Assessments', href: basePath },
        { label: 'Create assessment' },
      ],
      [basePath, dashboardHref],
    ),
  )

  function updateQuestion(index: number, patch: Partial<AssessmentQuestion>) {
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
      if (!question.title.trim() || !question.body.trim()) {
        toast.error(`Question ${index + 1}: title and body are required`)
        return null
      }
      if (options.length < 2) {
        toast.error(`Question ${index + 1}: add at least two options`)
        return null
      }
      if ((question.correctAnswers ?? []).length === 0) {
        toast.error(`Question ${index + 1}: select at least one correct answer`)
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
        title: question.title.trim(),
        body: question.body.trim(),
        questionId: question.questionId?.trim() || undefined,
        subtopic: question.subtopic?.trim() || undefined,
        explanation: question.explanation?.trim() || undefined,
        options,
        correctAnswers: [...new Set(question.correctAnswers ?? [])].sort(),
      })
    }

    return sanitized
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    const sanitizedQuestions = validateQuestions()
    if (!sanitizedQuestions) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
          timeLimitMinutes: timeLimitMinutes
            ? Number(timeLimitMinutes)
            : undefined,
          publish,
          questions: sanitizedQuestions,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Create failed')

      toast.success('Assessment created')
      router.push(`${basePath}/${data.id as string}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Create failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <header className='flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 md:px-6'>
        <div className='min-w-0 space-y-1'>
          <Button type='button' variant='ghost' size='sm' className='-ml-2' asChild>
            <Link href={basePath}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to assessments
            </Link>
          </Button>
          <h1 className='text-2xl font-semibold tracking-tight'>Create assessment</h1>
          <p className='text-sm text-muted-foreground'>
            Build multiple-choice questions for officers in your section.
          </p>
        </div>
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <Button type='button' variant='outline' asChild disabled={isSaving}>
            <Link href={basePath}>Cancel</Link>
          </Button>
          <Button type='button' onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
            Create assessment
          </Button>
        </div>
      </header>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-6 md:py-8'>
          <section className='space-y-4 rounded-lg border bg-card p-4 md:p-6'>
            <h2 className='text-sm font-medium'>Assessment details</h2>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='create-title'>Title</Label>
                <Input
                  id='create-title'
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='create-description'>Description</Label>
                <Textarea
                  id='create-description'
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  rows={3}
                  disabled={isSaving}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-due-date'>Due date</Label>
                <Input
                  id='create-due-date'
                  type='date'
                  value={dueDate}
                  onChange={event => setDueDate(event.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-time-limit'>Time limit (minutes)</Label>
                <Input
                  id='create-time-limit'
                  type='number'
                  min={1}
                  step={1}
                  value={timeLimitMinutes}
                  onChange={event => setTimeLimitMinutes(event.target.value)}
                  placeholder='e.g. 30'
                  disabled={isSaving}
                />
                <p className='text-xs text-muted-foreground'>
                  Optional. Officers get this long per attempt once they start.
                </p>
              </div>
              <div className='flex items-center justify-between rounded-md border p-3'>
                <div>
                  <p className='text-sm font-medium'>Publish immediately</p>
                  <p className='text-xs text-muted-foreground'>
                    Officers can take it right away.
                  </p>
                </div>
                <Switch
                  checked={publish}
                  onCheckedChange={setPublish}
                  disabled={isSaving}
                />
              </div>
            </div>
          </section>

          <section className='flex min-h-[28rem] flex-col space-y-4 rounded-lg border bg-card p-4 md:p-6'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='space-y-2'>
                <h2 className='text-sm font-medium'>Questions</h2>
                <p className='text-xs text-muted-foreground'>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
                <Progress value={questionProgress} className='h-2 w-full max-w-xs' />
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  setQuestions(current => [...current, emptyQuestion()])
                  setCurrentQuestionIndex(questions.length)
                }}
                disabled={isSaving}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add question
              </Button>
            </div>

            {currentQuestion ? (
              <div className='min-h-0 flex-1 space-y-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-medium'>
                    Question {currentQuestionIndex + 1}
                  </p>
                  {questions.length > 1 ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => {
                        setQuestions(current =>
                          current.filter((_, i) => i !== currentQuestionIndex),
                        )
                        setCurrentQuestionIndex(index =>
                          Math.max(0, Math.min(index, questions.length - 2)),
                        )
                      }}
                      disabled={isSaving}
                      aria-label='Remove question'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  ) : null}
                </div>

                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label>Short description</Label>
                    <Input
                      value={currentQuestion.title}
                      onChange={event =>
                        updateQuestion(currentQuestionIndex, {
                          title: event.target.value,
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Question body</Label>
                    <Textarea
                      value={currentQuestion.body}
                      onChange={event =>
                        updateQuestion(currentQuestionIndex, {
                          body: event.target.value,
                        })
                      }
                      rows={4}
                      disabled={isSaving}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Subtopic (optional)</Label>
                    <Input
                      value={currentQuestion.subtopic ?? ''}
                      onChange={event =>
                        updateQuestion(currentQuestionIndex, {
                          subtopic: event.target.value,
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className='flex items-center justify-between rounded-md border p-3'>
                    <div>
                      <p className='text-sm font-medium'>Multiple correct answers</p>
                      <p className='text-xs text-muted-foreground'>
                        Officers can select more than one option.
                      </p>
                    </div>
                    <Switch
                      checked={currentQuestion.questionType === 'multiple_choice'}
                      onCheckedChange={checked =>
                        updateQuestion(currentQuestionIndex, {
                          questionType: checked ? 'multiple_choice' : 'single_choice',
                          correctAnswers: [],
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label>Options (tap a letter to mark correct answers)</Label>
                  {OPTION_LABELS.map((label, optionIndex) => {
                    const option = currentQuestion.options?.[optionIndex]
                    if (!option) return null
                    const isCorrect = (currentQuestion.correctAnswers ?? []).includes(
                      label,
                    )
                    return (
                      <div key={label} className='flex items-start gap-2'>
                        <Button
                          type='button'
                          size='sm'
                          variant={isCorrect ? 'default' : 'outline'}
                          className='mt-0.5 h-8 w-8 shrink-0 p-0'
                          onClick={() =>
                            toggleCorrectAnswer(currentQuestionIndex, label)
                          }
                          disabled={isSaving}
                        >
                          {label}
                        </Button>
                        <Textarea
                          value={option.text}
                          onChange={event =>
                            updateOption(
                              currentQuestionIndex,
                              optionIndex,
                              event.target.value,
                            )
                          }
                          rows={2}
                          placeholder={`Option ${label}`}
                          disabled={isSaving}
                        />
                      </div>
                    )
                  })}
                </div>

                <div className='space-y-2'>
                  <Label>Explanation (optional)</Label>
                  <Textarea
                    value={currentQuestion.explanation ?? ''}
                    onChange={event =>
                      updateQuestion(currentQuestionIndex, {
                        explanation: event.target.value,
                      })
                    }
                    rows={3}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ) : null}

            <div className='flex items-center justify-between gap-3 border-t pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  setCurrentQuestionIndex(index => Math.max(index - 1, 0))
                }
                disabled={currentQuestionIndex === 0 || isSaving}
              >
                <ChevronLeft className='mr-1 h-4 w-4' />
                Back
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  setCurrentQuestionIndex(index =>
                    Math.min(index + 1, questions.length - 1),
                  )
                }
                disabled={
                  currentQuestionIndex >= questions.length - 1 || isSaving
                }
              >
                Next
                <ChevronRight className='ml-1 h-4 w-4' />
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
