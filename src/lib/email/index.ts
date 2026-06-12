/**
 * Reusable email layer (Resend).
 *
 * Environment:
 * - `RESEND_API_KEY` — required to send
 * - `EMAIL_FROM` — e.g. `Ziriwa <notifications@yourdomain.com>`
 * - `EMAIL_REPLY_TO` — optional default reply-to
 * - `EMAIL_ENABLED` — set to `false` to disable sending (logs only)
 * - `EMAIL_DEV_REDIRECT_TO` — comma-separated; in non-production, all mail goes here
 * - `CRON_SECRET` — protects `/api/cron/*` routes (Bearer token or `x-cron-secret` header)
 *
 * Usage:
 * - `queueNotificationEmail({ to, title, message })` — fire-and-forget from server code
 * - `sendTemplatedEmail({ templateId: 'notification', to, data })` — await result
 * - Add templates in `templates/` and register in `templates/registry.ts`
 * - Add feature helpers in `messages/` that wrap `queueTemplatedEmail`
 */

export { isEmailSendingEnabled } from '@/lib/email/env'
export { queueEmail, queueTemplatedEmail } from '@/lib/email/queue-email.server'
export {
  sendEmail,
  sendTemplatedEmail,
  type SendTemplatedEmailInput,
} from '@/lib/email/send-email.server'
export { queueNotificationEmail, sendNotificationEmail } from '@/lib/email/messages/notification.server'
export { sendSprintMissingSubmissionsEmail } from '@/lib/email/messages/sprint-missing-submissions.server'
export { sendSprintMissingSubmissionReminders } from '@/lib/email/jobs/send-sprint-missing-submission-reminders.server'
export type { NotificationEmailData } from '@/lib/email/templates/notification'
export type {
  EmailRecipient,
  EmailTag,
  RenderedEmail,
  SendEmailInput,
  SendEmailResult,
} from '@/lib/email/types'
export type { EmailTemplateData, EmailTemplateId } from '@/lib/email/templates/registry'
