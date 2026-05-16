import 'server-only'

import { client } from '@/sanity/lib/client'
import type { AppNotificationRow } from '@/lib/notifications/types'
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
): Promise<AppNotificationRow[]> {
  const drafts = await client.fetch<DraftSprintRow[]>(
    /* groq */ `*[_type == "weeklySprint" && status == "draft" && supervisor._ref == $staffId]
      | order(weekStart desc) {
        _id,
        weekLabel,
        "createdAt": _createdAt,
        "sectionSlug": section->slug.current,
        "sectionName": section->name
      }`,
    { staffId },
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
  }))
}
