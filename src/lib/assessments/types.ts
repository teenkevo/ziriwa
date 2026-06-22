export type AssessmentDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'

export type AssessmentQuestionType = 'single_choice' | 'multiple_choice'

export type AssessmentStatus = 'draft' | 'published' | 'archived'

export type AssessmentAttemptStatus = 'in_progress' | 'submitted'

export type AssessmentSubmissionReason = 'manual' | 'timeout'

export interface AssessmentQuestionOption {
  _key?: string
  label: 'A' | 'B' | 'C' | 'D' | 'E'
  text: string
}

export interface AssessmentQuestion {
  _key: string
  questionId?: string
  subtopic?: string
  difficulty?: AssessmentDifficulty
  questionType: AssessmentQuestionType
  title: string
  body: string
  options: AssessmentQuestionOption[]
  correctAnswers?: string[]
  explanation?: string
}

export interface AssessmentRecord {
  _id: string
  title: string
  description?: string
  status?: AssessmentStatus
  sectionId?: string
  sectionName?: string
  questions?: AssessmentQuestion[]
  publishedAt?: string
  startsAt?: string
  dueDate?: string
  timeLimitMinutes?: number
  createdByName?: string
  questionCount?: number
  attemptCount?: number
}

export interface AssessmentAttemptAnswer {
  questionKey: string
  selectedAnswers: string[]
}

export interface AssessmentAttemptRecord {
  _id: string
  assessmentId: string
  officerId?: string
  officerName?: string
  answers?: AssessmentAttemptAnswer[]
  score?: number
  maxScore?: number
  percentScore?: number
  submittedAt?: string
  startedAt?: string
  expiresAt?: string
  status?: AssessmentAttemptStatus
  submissionReason?: AssessmentSubmissionReason
}

export interface AssessmentListRow {
  _id: string
  title: string
  status?: AssessmentStatus
  questionCount: number
  publishedAt?: string
  startsAt?: string
  dueDate?: string
  timeLimitMinutes?: number
  attemptCount: number
  myAttemptId?: string
  myInProgressAttemptId?: string
  myScore?: number
  myMaxScore?: number
  myPercentScore?: number
}
