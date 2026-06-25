'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AssessmentAttemptReviewView } from '@/features/assessments/components/assessment-attempt-review-view'
import { ASSESSMENT_FULLSCREEN_DIALOG_CLASS } from '@/features/assessments/assessment-fullscreen-layout'
import type {
  AssessmentAttemptRecord,
  AssessmentQuestion,
  AssessmentRecord,
} from '@/lib/assessments/types'

export interface AssessmentOfficerAttemptReviewTarget {
  assessmentId: string
  attemptId: string
  officerName: string
}

interface AssessmentOfficerAttemptReviewDialogProps {
  target: AssessmentOfficerAttemptReviewTarget | null
  onOpenChange: (open: boolean) => void
  preloadedAssessment?: Pick<AssessmentRecord, 'title' | 'questions'>
}

export function AssessmentOfficerAttemptReviewDialog({
  target,
  onOpenChange,
  preloadedAssessment,
}: AssessmentOfficerAttemptReviewDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [assessmentTitle, setAssessmentTitle] = React.useState('')
  const [questions, setQuestions] = React.useState<AssessmentQuestion[]>([])
  const [attempt, setAttempt] = React.useState<Pick<
    AssessmentAttemptRecord,
    'answers' | 'score' | 'maxScore' | 'percentScore'
  > | null>(null)

  React.useEffect(() => {
    if (!target) {
      setAttempt(null)
      return
    }

    const reviewTarget = target

    if (preloadedAssessment) {
      setAssessmentTitle(preloadedAssessment.title)
      setQuestions(preloadedAssessment.questions ?? [])
    }

    let cancelled = false
    async function loadAttempt() {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/assessments/${reviewTarget.assessmentId}/attempts/${reviewTarget.attemptId}`,
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to load attempt')
        }
        if (cancelled) return

        setAssessmentTitle(data.assessment?.title ?? preloadedAssessment?.title ?? '')
        setQuestions(
          Array.isArray(data.assessment?.questions)
            ? data.assessment.questions
            : preloadedAssessment?.questions ?? [],
        )
        setAttempt(data.attempt ?? null)
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to load attempt',
          )
          onOpenChange(false)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadAttempt()
    return () => {
      cancelled = true
    }
  }, [onOpenChange, preloadedAssessment, target])

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={open => {
        if (!open) onOpenChange(false)
      }}
    >
      <DialogContent
        disableClose={isLoading}
        className={ASSESSMENT_FULLSCREEN_DIALOG_CLASS}
      >
        {isLoading || !attempt ? (
          <div className='flex flex-1 items-center justify-center p-6'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <AssessmentAttemptReviewView
            assessmentTitle={assessmentTitle}
            officerName={target?.officerName}
            questions={questions}
            attempt={attempt}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
