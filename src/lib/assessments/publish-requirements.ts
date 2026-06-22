import type { AssessmentQuestion } from '@/lib/assessments/types'
import { parseStartsAt, parseTimeLimitMinutes } from '@/lib/assessments/time-limit'

export interface AssessmentPublishInput {
  startsAt?: string
  timeLimitMinutes?: unknown
  questions?: unknown[]
}

export function isAssessmentStartsAtValid(startsAt?: string): boolean {
  return Boolean(parseStartsAt(startsAt))
}

export function isAssessmentTimeLimitValid(timeLimitMinutes?: unknown): boolean {
  const parsed =
    typeof timeLimitMinutes === 'number'
      ? timeLimitMinutes
      : parseTimeLimitMinutes(timeLimitMinutes)
  return Boolean(parsed && parsed > 0)
}

export function isAssessmentScheduleComplete(input: {
  startsAt?: string
  timeLimitMinutes?: unknown
}): boolean {
  return getAssessmentScheduleBlockers(input).length === 0
}

export function isAssessmentQuestionValid(question: AssessmentQuestion): boolean {
  const options = (question.options ?? []).filter(option => option.text.trim())
  if (!question.title.trim() || !question.body.trim()) return false
  if (options.length < 2) return false
  if ((question.correctAnswers ?? []).length === 0) return false
  if (
    question.questionType === 'single_choice' &&
    (question.correctAnswers ?? []).length !== 1
  ) {
    return false
  }
  return true
}

export function areAssessmentQuestionsValid(
  questions: AssessmentQuestion[],
): boolean {
  return questions.length > 0 && questions.every(isAssessmentQuestionValid)
}

export function getAssessmentScheduleBlockers(input: {
  startsAt?: string
  timeLimitMinutes?: unknown
}): string[] {
  const blockers: string[] = []

  if (!parseStartsAt(input.startsAt)) {
    blockers.push('start date and time')
  }

  const timeLimitMinutes =
    typeof input.timeLimitMinutes === 'number'
      ? input.timeLimitMinutes
      : parseTimeLimitMinutes(input.timeLimitMinutes)

  if (!timeLimitMinutes || timeLimitMinutes <= 0) {
    blockers.push('time limit')
  }

  return blockers
}

export function formatScheduleBlockersMessage(blockers: string[]): string {
  if (blockers.length === 0) return ''
  if (blockers.length === 1) {
    const [field] = blockers
    return `${field.charAt(0).toUpperCase()}${field.slice(1)} is required`
  }
  return `${blockers.slice(0, -1).join(', ')} and ${blockers.at(-1)} are required`
}

export function getAssessmentPublishBlockers(
  input: AssessmentPublishInput,
): string[] {
  return [
    ...getAssessmentScheduleBlockers(input),
    ...(Array.isArray(input.questions) && input.questions.length > 0
      ? []
      : ['at least one question']),
  ]
}

export function canPublishAssessment(input: AssessmentPublishInput): boolean {
  return getAssessmentPublishBlockers(input).length === 0
}

export function formatPublishBlockersMessage(blockers: string[]): string {
  if (blockers.length === 0) return ''
  return `Set ${blockers.join(', ')} before publishing`
}
