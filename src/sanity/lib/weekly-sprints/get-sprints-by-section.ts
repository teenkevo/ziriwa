import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getSprintsBySectionOracle } from '@/oracle/lib/weekly-sprints/get-sprints-by-section'

export type WorkSubmissionReviewEntry = {
  _key?: string
  role?: 'officer' | 'supervisor'
  action?: 'submit' | 'reject' | 'approve' | 'respond'
  message?: string
  createdAt?: string
}

export type WorkSubmission = {
  _key: string
  date?: string
  startTime?: string
  endTime?: string
  totalHours?: number
  description?: string
  output?: {
    asset?: {
      _id: string
      url?: string
      originalFilename?: string
      size?: number
      mimeType?: string
    }
  }
  revenueAssessed?: number
  status?: 'pending' | 'approved' | 'rejected'
  submittedAt?: string
  reviewThread?: WorkSubmissionReviewEntry[]
}

export type SprintTask = {
  _key: string
  description: string
  initiativeKey?: string
  initiativeTitle?: string
  activityKey?: string
  activityTitle?: string
  activityCategory?: 'normal_flow' | 'compliance' | 'staff_development' | 'stakeholder_engagement'
  status: 'pending' | 'accepted' | 'rejected' | 'revisions_requested'
  revisionReason?: string
  reviewedAt?: string
  assignee?: string | null
  assigneeName?: string | null
  priority?: string
  taskStatus?: 'to_do' | 'in_progress' | 'delivered' | 'in_review' | 'done'
  workSubmissions?: WorkSubmission[]
}

export type WeeklySprint = {
  _id: string
  weekLabel: string
  weekStart: string
  weekEnd: string
  status: 'draft' | 'submitted' | 'reviewed'
  supervisor: { _id: string; fullName: string }
  tasks: SprintTask[]
}

export async function getSprintsBySection(
  sectionId: string,
): Promise<WeeklySprint[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getSprintsBySectionOracle(sectionId)
  }

  const query = defineQuery(`
    *[_type == "weeklySprint" && section._ref == $sectionId] | order(weekStart desc) {
      _id,
      weekLabel,
      weekStart,
      weekEnd,
      status,
      supervisor->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      tasks[] {
        _key, description, activityCategory,
        initiativeKey, initiativeTitle, activityKey, activityTitle,
        status, revisionReason, reviewedAt,
        "assignee": assignee._ref,
        "assigneeName": assignee->fullName,
        priority, taskStatus,
        workSubmissions[] {
          _key, date, startTime, endTime, totalHours, description,
          output { asset->{ _id, url, originalFilename, size, mimeType } },
          revenueAssessed, status, submittedAt,
          reviewThread[] { _key, role, action, message, createdAt }
        }
      },
    }
  `)

  try {
    const sprints = await sanityFetch({
      query,
      params: { sectionId },
      revalidate: 0,
    })
    return (sprints as WeeklySprint[]) || []
  } catch (error) {
    console.error('Error fetching sprints by section', error)
    return []
  }
}
