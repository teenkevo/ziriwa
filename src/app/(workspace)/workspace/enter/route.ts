import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { applyWorkspaceCookiesToResponse } from '@/lib/workspace-cookies'
import { parseWorkspaceMode } from '@/lib/workspace-mode'
import { resolveWorkspaceEnterDestination } from '@/lib/workspace-enter.server'

/**
 * Sets workspace cookies on the HTTP response, then redirects.
 * Must be a Route Handler — cookies cannot be set from Server Components.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const mode = parseWorkspaceMode(req.nextUrl.searchParams.get('mode') ?? '')
  const projectId = req.nextUrl.searchParams.get('projectId')?.trim() ?? ''

  if (mode === 'mainstream' || mode === 'projects') {
    const destination = await resolveWorkspaceEnterDestination(mode, projectId)
    const res = NextResponse.redirect(new URL(destination.redirect, req.url))
    applyWorkspaceCookiesToResponse(
      res,
      destination.mode,
      destination.projectId,
    )
    return res
  }

  return NextResponse.redirect(new URL('/workspace', req.url))
}
