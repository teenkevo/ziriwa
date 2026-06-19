import type {
  AssessmentAttemptAnswer,
  AssessmentQuestion,
} from '@/lib/assessments/types'

function normalizeAnswers(values: string[]): string[] {
  return [...new Set(values.map(v => v.trim().toUpperCase()).filter(Boolean))].sort()
}

export function isQuestionAnswerCorrect(
  question: Pick<AssessmentQuestion, 'correctAnswers'>,
  selectedAnswers: string[],
): boolean {
  const expected = normalizeAnswers(question.correctAnswers ?? [])
  const selected = normalizeAnswers(selectedAnswers)
  if (expected.length !== selected.length) return false
  return expected.every((value, index) => value === selected[index])
}

export function scoreAssessmentAttempt(input: {
  questions: AssessmentQuestion[]
  answers: AssessmentAttemptAnswer[]
}): { score: number; maxScore: number; percentScore: number } {
  const maxScore = input.questions.length
  if (maxScore === 0) {
    return { score: 0, maxScore: 0, percentScore: 0 }
  }

  const answerByQuestionKey = new Map(
    input.answers.map(answer => [answer.questionKey, answer.selectedAnswers ?? []]),
  )

  let score = 0
  for (const question of input.questions) {
    const selected = answerByQuestionKey.get(question._key) ?? []
    if (isQuestionAnswerCorrect(question, selected)) {
      score += 1
    }
  }

  const percentScore = Math.round((score / maxScore) * 100)
  return { score, maxScore, percentScore }
}

export function difficultyLabel(difficulty?: string): string {
  switch (difficulty) {
    case 'beginner':
      return 'Beginner'
    case 'intermediate':
      return 'Intermediate'
    case 'advanced':
      return 'Advanced'
    case 'expert':
      return 'Expert'
    default:
      return difficulty ?? '—'
  }
}

export function questionTypeLabel(type?: string): string {
  switch (type) {
    case 'single_choice':
      return 'Single choice'
    case 'multiple_choice':
      return 'Multiple choice'
    default:
      return type ?? '—'
  }
}

export function assessmentStatusLabel(status?: string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
    default:
      return status ?? '—'
  }
}
