import { NextResponse } from 'next/server'

import { sendSprintMissingSubmissionReminders } from '@/lib/email/jobs/send-sprint-missing-submission-reminders.server'
import { isAuthorizedCronRequest } from '@/lib/cron-auth.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sendSprintMissingSubmissionReminders()
  return NextResponse.json(result)
}
