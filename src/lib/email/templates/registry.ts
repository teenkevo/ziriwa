import 'server-only'

import { notificationEmailTemplate } from '@/lib/email/templates/notification'
import type { NotificationEmailData } from '@/lib/email/templates/notification'
import { sprintMissingSubmissionsEmailTemplate } from '@/lib/email/templates/sprint-missing-submissions'
import type { SprintMissingSubmissionsEmailData } from '@/lib/email/templates/sprint-missing-submissions'
import type { EmailTemplateDefinition, RenderedEmail } from '@/lib/email/types'

interface EmailTemplateMap {
  notification: EmailTemplateDefinition<NotificationEmailData>
  'sprint-missing-submissions': EmailTemplateDefinition<SprintMissingSubmissionsEmailData>
}

export const emailTemplates = {
  notification: notificationEmailTemplate,
  'sprint-missing-submissions': sprintMissingSubmissionsEmailTemplate,
} satisfies EmailTemplateMap

export type EmailTemplateId = keyof EmailTemplateMap

export type EmailTemplateData<TId extends EmailTemplateId> =
  EmailTemplateMap[TId] extends EmailTemplateDefinition<infer TData>
    ? TData
    : never

export function renderEmailTemplate<TId extends EmailTemplateId>(
  templateId: TId,
  data: EmailTemplateData<TId>,
): RenderedEmail {
  const template = emailTemplates[templateId] as EmailTemplateDefinition<
    EmailTemplateData<TId>
  >
  return template.render(data)
}
