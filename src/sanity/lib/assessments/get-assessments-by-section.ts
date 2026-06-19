import 'server-only'

import { client } from '@/sanity/lib/client'
import type { AssessmentRecord } from '@/lib/assessments/types'

const ASSESSMENT_PROJECTION = /* groq */ `{
  _id,
  title,
  description,
  status,
  publishedAt,
  dueDate,
  timeLimitMinutes,
  "sectionId": section._ref,
  "sectionName": section->name,
  "createdByName": coalesce(createdBy->fullName, createdBy->firstName + " " + createdBy->lastName),
  "questionCount": count(questions),
  questions[]{
    _key,
    questionId,
    subtopic,
    difficulty,
    questionType,
    title,
    body,
    options[]{ _key, label, text },
    correctAnswers,
    explanation
  }
}`

export async function getAssessmentsBySection(
  sectionId: string,
  options?: { status?: 'draft' | 'published' | 'archived' | 'published_or_draft' },
): Promise<AssessmentRecord[]> {
  let statusFilter = ''
  if (options?.status === 'published') {
    statusFilter = '&& status == "published"'
  } else if (options?.status === 'draft') {
    statusFilter = '&& status == "draft"'
  } else if (options?.status === 'archived') {
    statusFilter = '&& status == "archived"'
  } else if (options?.status === 'published_or_draft') {
    statusFilter = '&& status in ["draft", "published"]'
  }

  return client.fetch<AssessmentRecord[]>(
    /* groq */ `*[_type == "assessment" && section._ref == $sectionId ${statusFilter}]
      | order(coalesce(publishedAt, _createdAt) desc) ${ASSESSMENT_PROJECTION}`,
    { sectionId },
  )
}

export async function getAssessmentById(
  assessmentId: string,
): Promise<AssessmentRecord | null> {
  return client.fetch<AssessmentRecord | null>(
    /* groq */ `*[_type == "assessment" && _id == $assessmentId][0]${ASSESSMENT_PROJECTION}`,
    { assessmentId },
  )
}

export async function getAssessmentAttemptCounts(
  assessmentIds: string[],
): Promise<Record<string, number>> {
  if (assessmentIds.length === 0) return {}

  const rows = await client.fetch<{ assessmentId: string }[]>(
    /* groq */ `*[_type == "assessmentAttempt" && assessment._ref in $assessmentIds && status == "submitted"]{
      "assessmentId": assessment._ref
    }`,
    { assessmentIds },
  )

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.assessmentId] = (counts[row.assessmentId] ?? 0) + 1
  }
  return counts
}
