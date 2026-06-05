import { NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { resolvePostSignInAction } from '@/lib/workspace-entry.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const action = await resolvePostSignInAction()
  return NextResponse.json({ redirect: action.path })
}
