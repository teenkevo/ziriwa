import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { audit } from '@/lib/audit-log/events'
import { isSuperadmin } from '@/lib/authz/guards.server'
import {
  clearImpersonationCookie,
  readImpersonationEmail,
  setImpersonationCookie,
} from '@/lib/impersonation/cookie.server'
import { mainstreamDashboardPathForRole } from '@/lib/impersonation/redirect.server'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'
import { parseAppRole, type AppRole } from '@/lib/app-role'
import { getSuperadminEmailWhitelist } from '@/lib/authz/env'
import { client } from '@/sanity/lib/client'

export const dynamic = 'force-dynamic'

type StaffTarget = {
  _id: string
  name?: string
  email?: string
  role?: string
}

async function loadImpersonationTargets(): Promise<
  { email: string; name: string; role: AppRole | null }[]
> {
  const superadminEmails = new Set(getSuperadminEmailWhitelist())
  const rows = await client.fetch<
    { _id: string; name?: string; email?: string; role?: string }[]
  >(
    /* groq */ `
      *[_type == "staff" && status == "active" && defined(email)] | order(name asc) {
        _id,
        name,
        "email": lower(email),
        role
      }
    `,
  )

  return (rows ?? [])
    .map(row => {
      const email = row.email?.trim().toLowerCase() ?? ''
      if (!email || superadminEmails.has(email)) return null
      const role = parseAppRole(row.role)
      if (!role) return null
      return {
        email,
        name: row.name?.trim() || email,
        role,
      }
    })
    .filter((row): row is { email: string; name: string; role: AppRole } =>
      Boolean(row),
    )
}

async function loadStaffTarget(email: string): Promise<StaffTarget | null> {
  return client.fetch<StaffTarget | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
      _id,
      name,
      email,
      role
    }`,
    { email: email.trim().toLowerCase() },
  )
}

export async function GET() {
  if (!(await isSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [targets, email] = await Promise.all([
    loadImpersonationTargets(),
    readImpersonationEmail(),
  ])

  if (!email) {
    return NextResponse.json({ active: false, targets })
  }

  const staff = await loadStaffTarget(email)
  if (!staff) {
    await clearImpersonationCookie()
    return NextResponse.json({ active: false, targets })
  }

  return NextResponse.json({
    active: true,
    email,
    name: staff.name?.trim() || email,
    role: parseAppRole(staff.role),
    staffId: staff._id,
    targets,
  })
}

export async function POST(req: NextRequest) {
  if (!(await isSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { email?: string } | null
  const email = body?.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  if (getSuperadminEmailWhitelist().includes(email)) {
    return NextResponse.json(
      { error: 'Cannot impersonate a superadmin account' },
      { status: 400 },
    )
  }

  const staff = await loadStaffTarget(email)
  if (!staff) {
    return NextResponse.json(
      { error: 'No active staff record found for that email' },
      { status: 404 },
    )
  }

  const role = parseAppRole(staff.role)
  if (!role) {
    return NextResponse.json(
      { error: 'Target staff has no application role' },
      { status: 400 },
    )
  }

  const ctx = await getViewerContext()
  await setImpersonationCookie(email)

  const realStaff = await loadStaffTarget(ctx.realEmail)
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

  return NextResponse.json({
    success: true,
    redirect: mainstreamDashboardPathForRole(role),
    target: {
      email,
      name: staff.name?.trim() || email,
      role,
      staffId: staff._id,
    },
  })
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = await readImpersonationEmail()
  const ctx = await getViewerContext()
  const staff = email ? await loadStaffTarget(email) : null

  await clearImpersonationCookie()

  if (email && staff && ctx.isSuperadmin) {
    const realStaff = await loadStaffTarget(ctx.realEmail)
    audit.impersonation.stopped(
      staff._id,
      staff.name?.trim() || email,
      {
        targetEmail: email,
        targetRole: parseAppRole(staff.role),
        impersonatorEmail: ctx.realEmail,
        impersonatorName: ctx.realName,
      },
      {
        name: ctx.realName,
        email: ctx.realEmail,
        staffId: realStaff?._id,
      },
    )
  }

  return NextResponse.json({
    success: true,
    redirect: '/departments',
  })
}
