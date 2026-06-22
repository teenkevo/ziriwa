import 'server-only'

import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import {
  canManageAssessments,
  canTakeAssessments,
  canViewAssessmentResults,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import type { AssessmentListRow } from '@/lib/assessments/types'
import {
  getAssessmentAttemptCounts,
  getAssessmentsBySection,
} from '@/sanity/lib/assessments/get-assessments-by-section'
import {
  getInProgressAttemptForOfficer,
  getSubmittedAttemptForOfficer,
} from '@/sanity/lib/assessments/get-assessment-attempts'
import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { areAssessmentResultsReleased } from '@/lib/assessments/results-release'
import { isAssessmentStartOpen } from '@/lib/assessments/time-limit'
import { getOfficersBySection } from '@/sanity/lib/staff/get-staff-by-section'

export type AssessmentWorkspaceRole = 'manager' | 'supervisor' | 'officer'

export async function loadSectionAssessmentsList(input: {
  role: AssessmentWorkspaceRole
}): Promise<{
  sectionId: string
  sectionName: string
  sectionOfficerCount: number
  items: AssessmentListRow[]
  canManage: boolean
  canTake: boolean
  canViewResults: boolean
} | null> {
  const sections = await getManagedSectionsForViewer()
  const section = sections[0]
  if (!section?._id) return null

  const { access } = await getAssessmentAccessForSection(section._id)
  const canManage = canManageAssessments(access)
  const canTake = canTakeAssessments(access)
  const canViewResults = canViewAssessmentResults(access)

  if (input.role === 'manager' && !canManage && !access.isGlobalAdmin) {
    return null
  }
  if (input.role === 'supervisor' && !canViewResults) {
    return null
  }
  if (input.role === 'officer' && !canTake) {
    return null
  }

  const status =
    input.role === 'manager'
      ? ('published_or_draft' as const)
      : ('published' as const)

  const assessments = await getAssessmentsBySection(section._id, { status })
  const attemptCounts = await getAssessmentAttemptCounts(
    assessments.map(assessment => assessment._id),
  )
  const sectionOfficers = await getOfficersBySection(section._id)
  const sectionOfficerCount = sectionOfficers.length

  const viewerStaffId = await getViewerStaffId()
  const items: AssessmentListRow[] = []

  for (const assessment of assessments) {
    let myAttemptId: string | undefined
    let myInProgressAttemptId: string | undefined
    let myScore: number | undefined
    let myMaxScore: number | undefined
    let myPercentScore: number | undefined

    if (input.role === 'officer' && viewerStaffId) {
      const attempt = await getSubmittedAttemptForOfficer(
        assessment._id,
        viewerStaffId,
      )
      if (attempt) {
        myAttemptId = attempt._id
        myScore = attempt.score
        myMaxScore = attempt.maxScore
        myPercentScore = attempt.percentScore
      } else {
        const inProgress = await getInProgressAttemptForOfficer(
          assessment._id,
          viewerStaffId,
        )
        if (inProgress) {
          myInProgressAttemptId = inProgress._id
        }
      }
    }

    const resultsReleased = areAssessmentResultsReleased(assessment)

    items.push({
      _id: assessment._id,
      title: assessment.title,
      status: assessment.status,
      questionCount: assessment.questionCount ?? assessment.questions?.length ?? 0,
      publishedAt: assessment.publishedAt,
      startsAt: assessment.startsAt,
      dueDate: assessment.dueDate,
      timeLimitMinutes: assessment.timeLimitMinutes,
      attemptCount: attemptCounts[assessment._id] ?? 0,
      myAttemptId,
      myInProgressAttemptId,
      myScore: resultsReleased ? myScore : undefined,
      myMaxScore: resultsReleased ? myMaxScore : undefined,
      myPercentScore: resultsReleased ? myPercentScore : undefined,
      canStart:
        input.role === 'officer'
          ? isAssessmentStartOpen(assessment.startsAt)
          : undefined,
      resultsReleased:
        input.role === 'officer' ? resultsReleased : undefined,
    })
  }

  return {
    sectionId: section._id,
    sectionName: section.name,
    sectionOfficerCount,
    items,
    canManage,
    canTake,
    canViewResults,
  }
}
