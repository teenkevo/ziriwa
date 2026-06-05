import 'server-only'

import { client } from '@/sanity/lib/client'
import type { WorkspaceMode } from '@/lib/workspace-mode'
import type { AppNotificationRow } from '@/lib/notifications/types'

export type NotificationWorkspaceScope = 'mainstream' | 'projects'

export interface NotificationWorkspaceContext {
  mode: WorkspaceMode
  projectId: string | null
}

export interface AppNotificationRowWithScope extends AppNotificationRow {
  workspaceScope?: NotificationWorkspaceScope | null
  projectId?: string | null
}

export async function resolveNotificationWorkspaceFromSection(
  sectionId: string,
): Promise<{
  workspaceScope: NotificationWorkspaceScope
  projectId: string | null
}> {
  const projectId = await client.fetch<string | null>(
    /* groq */ `*[_type == "section" && _id == $sectionId][0].project._ref`,
    { sectionId },
  )

  if (projectId) {
    return { workspaceScope: 'projects', projectId }
  }

  return { workspaceScope: 'mainstream', projectId: null }
}

function sectionSlugFromHref(href?: string): string | null {
  if (!href) return null
  const match = href.match(/^\/sections\/([^/?#]+)/)
  return match?.[1] ?? null
}

async function resolveSectionProjectIdsBySlug(
  slugs: string[],
): Promise<Map<string, string | null>> {
  if (slugs.length === 0) return new Map()

  const rows = await client.fetch<
    { slug: string; projectId: string | null }[]
  >(
    /* groq */ `
      *[_type == "section" && slug.current in $slugs]{
        "slug": slug.current,
        "projectId": project._ref
      }
    `,
    { slugs },
  )

  return new Map((rows ?? []).map(row => [row.slug, row.projectId ?? null]))
}

export function notificationBelongsToWorkspace(
  notification: AppNotificationRowWithScope,
  sectionProjectId: string | null | undefined,
  ctx: NotificationWorkspaceContext,
): boolean {
  const explicitScope = notification.workspaceScope
  const explicitProjectId = notification.projectId

  if (explicitScope === 'mainstream') {
    return ctx.mode === 'mainstream'
  }

  if (explicitScope === 'projects') {
    if (ctx.mode !== 'projects' || !ctx.projectId) return false
    return explicitProjectId === ctx.projectId
  }

  if (notification.href?.startsWith('/projects/')) {
    return ctx.mode === 'projects'
  }

  if (sectionProjectId) {
    if (ctx.mode === 'projects') {
      return Boolean(ctx.projectId && sectionProjectId === ctx.projectId)
    }
    return false
  }

  return ctx.mode === 'mainstream'
}

export async function filterNotificationsForWorkspace(
  notifications: AppNotificationRowWithScope[],
  ctx: NotificationWorkspaceContext,
): Promise<AppNotificationRowWithScope[]> {
  const slugs = [
    ...new Set(
      notifications
        .map(n => sectionSlugFromHref(n.href))
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ]

  const sectionProjectBySlug = await resolveSectionProjectIdsBySlug(slugs)

  return notifications.filter(notification => {
    const slug = sectionSlugFromHref(notification.href)
    const sectionProjectId = slug
      ? sectionProjectBySlug.get(slug)
      : undefined

    return notificationBelongsToWorkspace(
      notification,
      sectionProjectId,
      ctx,
    )
  })
}
