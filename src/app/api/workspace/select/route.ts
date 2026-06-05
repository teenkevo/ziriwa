import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { canAccessProjectWorkspace } from '@/lib/project-access.server'
import { resolveProjectWorkspaceHref } from '@/lib/project-workspace-entry.server'
import { applyWorkspaceCookiesToResponse } from '@/lib/workspace-cookies'
import { parseWorkspaceMode } from '@/lib/workspace-mode'

/** GET ?mode=… — legacy; forwards to enter route. */
export async function GET(req: NextRequest) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const mode = req.nextUrl.searchParams.get('mode') ?? ''
  const projectId = req.nextUrl.searchParams.get('projectId') ?? ''
  const enter = new URL('/workspace/enter', req.url)
  enter.searchParams.set('mode', mode)
  if (projectId) enter.searchParams.set('projectId', projectId)
  return NextResponse.redirect(enter)
}

/** POST { mode: "projects", projectId } — enter project workspace (JSON + cookies). */
export async function POST(req: NextRequest) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const body = await req.json().catch(() => ({}))
  const mode = parseWorkspaceMode(body.mode)
  if (mode !== 'projects') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const projectId =
    typeof body.projectId === 'string' ? body.projectId.trim() : ''
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  if (!(await canAccessProjectWorkspace(projectId))) {
    return NextResponse.json(
      { error: 'You are not a member of this project' },
      { status: 403 },
    )
  }

  const redirectTo = await resolveProjectWorkspaceHref(projectId)
  if (!redirectTo) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  const res = NextResponse.json({ redirectTo })
  applyWorkspaceCookiesToResponse(res, 'projects', projectId)
  return res
}
