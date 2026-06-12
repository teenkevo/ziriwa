import 'server-only'

import { sendSprintCompletedEmail } from '@/lib/email/messages/sprint-status.server'
import { fetchSprintStatusEmailBundles } from '@/lib/sprint-status-email'
import { isSprintJustEnded } from '@/lib/sprint-week'

export interface SprintCompletedEmailResult {
  date: string
  recipientsTargeted: number
  emailsSent: number
  skipped: number
  errors: string[]
}

export async function sendSprintCompletedEmails(
  now = new Date(),
): Promise<SprintCompletedEmailResult> {
  const today = now.toISOString().slice(0, 10)
  const bundles = (await fetchSprintStatusEmailBundles(today, now)).filter(
    bundle => isSprintJustEnded(bundle.weekEnd, now),
  )

  const result: SprintCompletedEmailResult = {
    date: today,
    recipientsTargeted: bundles.length,
    emailsSent: 0,
    skipped: 0,
    errors: [],
  }

  for (const bundle of bundles) {
    const sendResult = await sendSprintCompletedEmail({
      to: bundle.recipientEmail,
      recipientName: bundle.recipientName,
      recipientRole: bundle.recipientRole,
      sectionName: bundle.sectionName,
      weekLabel: bundle.weekLabel,
      rows: bundle.rows,
      summary: bundle.summary,
      idempotencyKey: `sprint-completed:${bundle.sprintId}:${bundle.recipientRole}:${bundle.recipientId}:${bundle.weekStart}`,
    })

    if (!sendResult.ok) {
      result.errors.push(`${bundle.recipientEmail}: ${sendResult.error}`)
      continue
    }

    if (sendResult.skipped) {
      result.skipped++
      continue
    }

    result.emailsSent++
  }

  return result
}
