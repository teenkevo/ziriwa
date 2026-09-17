import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { applyImpersonationCookieClear } from '@/lib/impersonation/cookie.server'
import { IMPERSONATION_COOKIE_NAME } from '@/lib/impersonation/constants'

export const dynamic = 'force-dynamic'

/**
 * Clears impersonation (route handler Set-Cookie) then returns to the picker.
 * Always a one-hop redirect — the workspace page must not redirect back here.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const res = NextResponse.redirect(new URL('/workspace', req.url), 303)
  applyImpersonationCookieClear(res)
  res.cookies.delete({
    name: IMPERSONATION_COOKIE_NAME,
    path: '/',
  })
  return res
}
