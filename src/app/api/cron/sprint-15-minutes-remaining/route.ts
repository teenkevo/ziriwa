import { NextResponse } from 'next/server'

import { sendSprint15MinutesEmails } from '@/lib/email/jobs/send-sprint-15-minutes-emails.server'
import { isAuthorizedCronRequest } from '@/lib/cron-auth.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sendSprint15MinutesEmails()
  return NextResponse.json(result)
}
