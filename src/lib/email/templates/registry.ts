import 'server-only'

import { notificationEmailTemplate } from '@/lib/email/templates/notification'
import type { NotificationEmailData } from '@/lib/email/templates/notification'
import { orgWorkItemEmailTemplate } from '@/lib/email/templates/org-work-item'
import type { OrgWorkItemEmailData } from '@/lib/email/templates/org-work-item'
import { sprintMissingSubmissionsEmailTemplate } from '@/lib/email/templates/sprint-missing-submissions'
import type { SprintMissingSubmissionsEmailData } from '@/lib/email/templates/sprint-missing-submissions'
import { sprint15MinutesRemainingEmailTemplate } from '@/lib/email/templates/sprint-15-minutes-remaining'
import type { Sprint15MinutesRemainingEmailData } from '@/lib/email/templates/sprint-15-minutes-remaining'
import { sprint30MinutesRemainingEmailTemplate } from '@/lib/email/templates/sprint-30-minutes-remaining'
import type { Sprint30MinutesRemainingEmailData } from '@/lib/email/templates/sprint-30-minutes-remaining'
import { sprintCompletedEmailTemplate } from '@/lib/email/templates/sprint-completed'
import type { SprintCompletedEmailData } from '@/lib/email/templates/sprint-completed'
import { sprintWorkSubmissionOutcomeEmailTemplate } from '@/lib/email/templates/sprint-work-submission-outcome'
import type { SprintWorkSubmissionOutcomeEmailData } from '@/lib/email/templates/sprint-work-submission-outcome'
import { sprintPlanReviewOutcomeEmailTemplate } from '@/lib/email/templates/sprint-plan-review-outcome'
import type { SprintPlanReviewOutcomeEmailData } from '@/lib/email/templates/sprint-plan-review-outcome'
import { sprintPlanSubmittedEmailTemplate } from '@/lib/email/templates/sprint-plan-submitted'
import type { SprintPlanSubmittedEmailData } from '@/lib/email/templates/sprint-plan-submitted'
import { sprintWorkSubmissionReviewEmailTemplate } from '@/lib/email/templates/sprint-work-submission-review'
import type { SprintWorkSubmissionReviewEmailData } from '@/lib/email/templates/sprint-work-submission-review'
import type { EmailTemplateDefinition, RenderedEmail } from '@/lib/email/types'

interface EmailTemplateMap {
  notification: EmailTemplateDefinition<NotificationEmailData>
  'org-work-item': EmailTemplateDefinition<OrgWorkItemEmailData>
  'sprint-missing-submissions': EmailTemplateDefinition<SprintMissingSubmissionsEmailData>
  'sprint-30-minutes-remaining': EmailTemplateDefinition<Sprint30MinutesRemainingEmailData>
  'sprint-15-minutes-remaining': EmailTemplateDefinition<Sprint15MinutesRemainingEmailData>
  'sprint-completed': EmailTemplateDefinition<SprintCompletedEmailData>
  'sprint-plan-submitted': EmailTemplateDefinition<SprintPlanSubmittedEmailData>
  'sprint-plan-review-outcome': EmailTemplateDefinition<SprintPlanReviewOutcomeEmailData>
  'sprint-work-submission-review': EmailTemplateDefinition<SprintWorkSubmissionReviewEmailData>
  'sprint-work-submission-outcome': EmailTemplateDefinition<SprintWorkSubmissionOutcomeEmailData>
}

export const emailTemplates = {
  notification: notificationEmailTemplate,
  'org-work-item': orgWorkItemEmailTemplate,
  'sprint-missing-submissions': sprintMissingSubmissionsEmailTemplate,
  'sprint-30-minutes-remaining': sprint30MinutesRemainingEmailTemplate,
  'sprint-15-minutes-remaining': sprint15MinutesRemainingEmailTemplate,
  'sprint-completed': sprintCompletedEmailTemplate,
  'sprint-plan-submitted': sprintPlanSubmittedEmailTemplate,
  'sprint-plan-review-outcome': sprintPlanReviewOutcomeEmailTemplate,
  'sprint-work-submission-review': sprintWorkSubmissionReviewEmailTemplate,
  'sprint-work-submission-outcome': sprintWorkSubmissionOutcomeEmailTemplate,
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
