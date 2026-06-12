import { NextResponse } from 'next/server'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { sendSprintMissingSubmissionsEmail } from '@/lib/email/messages/sprint-missing-submissions.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { fetchSprintMissingSubmissionBundlesForManagerScope } from '@/lib/sprint-missing-submissions'

export async function POST() {
  const [role, viewerStaffId] = await Promise.all([
    getAppRole(),
    getViewerStaffId(),
  ])

  if (role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!viewerStaffId) {
    return NextResponse.json(
      { error: 'No staff record found for the current user.' },
      { status: 400 },
    )
  }

  const bundles =
    await fetchSprintMissingSubmissionBundlesForManagerScope(viewerStaffId)

  if (bundles.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: false,
      emailsSent: 0,
      message:
        'No at-risk sprint activities without submissions in your sections.',
    })
  }

  const testRunId = Date.now()
  let emailsSent = 0
  let skipped = 0
  const errors: string[] = []
  const byRole = { manager: 0, supervisor: 0, officer: 0 }

  for (const bundle of bundles) {
    const sendResult = await sendSprintMissingSubmissionsEmail({
      to: bundle.recipientEmail,
      recipientName: bundle.recipientName,
      recipientRole: bundle.recipientRole,
      weekLabel: bundle.weekLabel,
      rows: bundle.rows,
      idempotencyKey: `sprint-missing-submissions-test:${bundle.recipientRole}:${bundle.recipientId}:${testRunId}`,
    })

    if (!sendResult.ok) {
      errors.push(`${bundle.recipientEmail}: ${sendResult.error}`)
      continue
    }

    if (sendResult.skipped) {
      skipped++
      continue
    }

    emailsSent++
    byRole[bundle.recipientRole]++
  }

  if (errors.length > 0 && emailsSent === 0) {
    return NextResponse.json(
      { error: errors.join('; ') },
      { status: 500 },
    )
  }

  const roleSummary = [
    byRole.manager ? `${byRole.manager} manager` : '',
    byRole.supervisor ? `${byRole.supervisor} supervisor` : '',
    byRole.officer ? `${byRole.officer} officer` : '',
  ]
    .filter(Boolean)
    .join(', ')

  return NextResponse.json({
    ok: true,
    sent: emailsSent > 0,
    emailsSent,
    skipped,
    recipients: bundles.length,
    byRole,
    errors,
    message:
      emailsSent > 0
        ? `Sent ${emailsSent} sprint reminder email${emailsSent === 1 ? '' : 's'} (${roleSummary}).`
        : 'Email sending is disabled or not configured.',
  })
}
