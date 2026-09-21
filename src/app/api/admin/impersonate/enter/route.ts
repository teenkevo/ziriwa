import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { audit } from '@/lib/audit-log/events'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { parseAppRole } from '@/lib/app-role'
import { getSuperadminEmailWhitelist } from '@/lib/authz/env'
import { applyImpersonationCookieSet } from '@/lib/impersonation/cookie.server'
import { mainstreamDashboardPathForRole } from '@/lib/impersonation/redirect.server'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'
import { applyWorkspaceCookiesToResponse } from '@/lib/workspace-cookies'
import { client } from '@/sanity/lib/client'

export const dynamic = 'force-dynamic'

/**
 * Full-document navigation entry for impersonation.
 * Sets cookies on the redirect response (reliable in production) then lands
 * on the target role dashboard — same pattern as /workspace/enter.
 */
export async function GET(req: NextRequest) {
  if (!(await isSuperadmin())) {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email) {
    return NextResponse.redirect(new URL('/departments', req.url))
  }

  if (getSuperadminEmailWhitelist().includes(email)) {
    return NextResponse.redirect(new URL('/departments', req.url))
  }

  const staff = await client.fetch<{
    _id: string
    name?: string
    role?: string
  } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
      _id,
      "name": coalesce(fullName, firstName + " " + lastName, email),
      role
    }`,
    { email },
  )

  const role = parseAppRole(staff?.role)
  if (!staff || !role) {
    return NextResponse.redirect(new URL('/departments', req.url))
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const ctx = await getViewerContext()
  const realStaff = await client.fetch<{ _id: string } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]{ _id }`,
    { email: ctx.realEmail },
  )

  audit.impersonation.started(
    staff._id,
    staff.name?.trim() || email,
    {
      targetEmail: email,
      targetRole: role,
      impersonatorEmail: ctx.realEmail,
      impersonatorName: ctx.realName,
    },
    {
      name: ctx.realName,
      email: ctx.realEmail,
      staffId: realStaff?._id,
    },
  )

  const res = NextResponse.redirect(
    new URL(mainstreamDashboardPathForRole(role), req.url),
    303,
  )
  await applyImpersonationCookieSet(res, email)
  applyWorkspaceCookiesToResponse(res, 'mainstream')
  return res
}
