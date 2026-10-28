import { NextResponse } from 'next/server'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { rewriteLegacyActivityTypes } from '@/lib/rewrite-legacy-activity-types.server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Temporary production control. Remove with the User management button. */
export async function POST() {
  if (!(await isSuperadmin())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const result = await rewriteLegacyActivityTypes()
  return NextResponse.json(result)
}
