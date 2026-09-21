import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { applyImpersonationCookieClear } from '@/lib/impersonation/cookie.server'
import { IMPERSONATION_COOKIE_NAME } from '@/lib/impersonation/constants'

export const dynamic = 'force-dynamic'

function isPrefetchRequest(req: NextRequest): boolean {
  const purpose = req.headers.get('purpose') ?? req.headers.get('sec-purpose')
  if (purpose?.toLowerCase().includes('prefetch')) return true
  if (req.headers.get('next-router-prefetch') === '1') return true
  if (req.headers.get('x-middleware-prefetch') === '1') return true
  return false
}

/**
 * Clears impersonation (route handler Set-Cookie) then returns to the picker.
 * Always a one-hop redirect — the workspace page must not redirect back here.
 * Prefetch must never clear the cookie (Next.js Link prefetch of this URL
 * was wiping impersonation immediately after start in production).
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  // Prefetch / speculative loads must not mutate cookies.
  if (isPrefetchRequest(req)) {
    return new NextResponse(null, { status: 204 })
  }

  const res = NextResponse.redirect(new URL('/workspace', req.url), 303)
  applyImpersonationCookieClear(res)
  res.cookies.delete({
    name: IMPERSONATION_COOKIE_NAME,
    path: '/',
  })
  return res
}
