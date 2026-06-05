import 'server-only'

import { client } from '@/sanity/lib/client'
import type { AppNotificationRow } from '@/lib/notifications/types'
import type { NotificationWorkspaceContext } from '@/lib/notifications/notification-workspace.server'
import { VIRTUAL_SPRINT_UNSUBMITTED_PREFIX } from '@/lib/notifications/virtual-notification'

interface DraftSprintRow {
  _id: string
  weekLabel: string
  createdAt: string
  sectionSlug?: string
  sectionName?: string
}

/** Live reminders for draft sprints not yet submitted to the manager. */
export async function getUnsubmittedSprintNotifications(
  staffId: string,
  workspace: NotificationWorkspaceContext,
): Promise<AppNotificationRow[]> {
  const isProjects = workspace.mode === 'projects' && Boolean(workspace.projectId)

  const drafts = await client.fetch<DraftSprintRow[]>(
    /* groq */ `*[_type == "weeklySprint"
      && status == "draft"
      && supervisor._ref == $staffId
      && (
        ($isProjects == false && !defined(section->project._ref))
        || ($isProjects == true && section->project._ref == $projectId)
      )
    ] | order(weekStart desc) {
      _id,
      weekLabel,
      "createdAt": _createdAt,
      "sectionSlug": section->slug.current,
      "sectionName": section->name
    }`,
    {
      staffId,
      isProjects,
      projectId: workspace.projectId ?? '',
    },
  )

  return drafts.map(sprint => ({
    _id: `${VIRTUAL_SPRINT_UNSUBMITTED_PREFIX}${sprint._id}`,
    type: 'sprint_unsubmitted',
    title: 'Unsubmitted sprint',
    body: [
      sprint.weekLabel,
      sprint.sectionName,
      'Submit to your manager for approval',
    ]
      .filter(Boolean)
      .join(' · '),
    href: sprint.sectionSlug
      ? `/sections/${sprint.sectionSlug}?tab=weekly-sprint`
      : undefined,
    createdAt: sprint.createdAt,
    workspaceScope: isProjects ? 'projects' : 'mainstream',
    projectId: isProjects ? workspace.projectId : null,
  }))
}
