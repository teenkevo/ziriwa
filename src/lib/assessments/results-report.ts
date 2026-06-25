import { difficultyLabel, isQuestionAnswerCorrect } from '@/lib/assessments/scoring'
import type {
  AssessmentAttemptAnswer,
  AssessmentDifficulty,
  AssessmentQuestion,
} from '@/lib/assessments/types'

const DIFFICULTY_ORDER: AssessmentDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]

export const UNSPECIFIED_AREA_LABEL = 'General'
export const UNSPECIFIED_DIFFICULTY_KEY = 'unspecified' as const

export interface AssessmentBreakdownRow {
  key: string
  label: string
  correct: number
  total: number
  percent: number
}

export interface AssessmentQuestionOutcome {
  index: number
  questionKey: string
  isCorrect: boolean
  subtopic?: string
  difficulty?: AssessmentDifficulty
}

export interface AssessmentResultsReport {
  score: number
  maxScore: number
  percentScore: number
  byArea: AssessmentBreakdownRow[]
  byDifficulty: AssessmentBreakdownRow[]
  questionOutcomes: AssessmentQuestionOutcome[]
}

function percent(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

function areaLabel(subtopic?: string): string {
  const trimmed = subtopic?.trim()
  return trimmed || UNSPECIFIED_AREA_LABEL
}

function buildBreakdown(
  entries: Array<{ groupKey: string; label: string; isCorrect: boolean }>,
): AssessmentBreakdownRow[] {
  const grouped = new Map<
    string,
    { label: string; correct: number; total: number }
  >()

  for (const entry of entries) {
    const current = grouped.get(entry.groupKey) ?? {
      label: entry.label,
      correct: 0,
      total: 0,
    }
    current.total += 1
    if (entry.isCorrect) current.correct += 1
    grouped.set(entry.groupKey, current)
  }

  return [...grouped.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      correct: value.correct,
      total: value.total,
      percent: percent(value.correct, value.total),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function buildAssessmentResultsReport(input: {
  questions: AssessmentQuestion[]
  answers: AssessmentAttemptAnswer[]
}): AssessmentResultsReport {
  const answerByQuestionKey = new Map(
    input.answers.map(answer => [
      answer.questionKey,
      answer.selectedAnswers ?? [],
    ]),
  )

  const questionOutcomes: AssessmentQuestionOutcome[] = input.questions.map(
    (question, index) => {
      const selected = answerByQuestionKey.get(question._key) ?? []
      return {
        index,
        questionKey: question._key,
        isCorrect: isQuestionAnswerCorrect(question, selected),
        subtopic: question.subtopic,
        difficulty: question.difficulty,
      }
    },
  )

  const score = questionOutcomes.filter(outcome => outcome.isCorrect).length
  const maxScore = input.questions.length

  const byArea = buildBreakdown(
    questionOutcomes.map(outcome => ({
      groupKey: areaLabel(outcome.subtopic),
      label: areaLabel(outcome.subtopic),
      isCorrect: outcome.isCorrect,
    })),
  )

  const byDifficulty = buildBreakdown(
    questionOutcomes.map(outcome => ({
      groupKey: outcome.difficulty ?? UNSPECIFIED_DIFFICULTY_KEY,
      label: outcome.difficulty
        ? difficultyLabel(outcome.difficulty)
        : 'Not specified',
      isCorrect: outcome.isCorrect,
    })),
  ).sort((a, b) => {
    const order = (key: string) => {
      const index = DIFFICULTY_ORDER.indexOf(key as AssessmentDifficulty)
      return index === -1 ? DIFFICULTY_ORDER.length : index
    }
    return order(a.key) - order(b.key)
  })

  return {
    score,
    maxScore,
    percentScore: percent(score, maxScore),
    byArea,
    byDifficulty,
    questionOutcomes,
  }
}
