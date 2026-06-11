import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { applyImpersonationCookieClear } from '@/lib/impersonation/cookie.server'

export const dynamic = 'force-dynamic'

/** Clears impersonation cookie (route handler only) then returns to workspace picker. */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const res = NextResponse.redirect(new URL('/workspace', req.url))
  applyImpersonationCookieClear(res)
  return res
}
