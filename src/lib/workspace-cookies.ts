import type { NextResponse } from 'next/server'

import {
  PROJECT_ID_COOKIE,
  WORKSPACE_MODE_COOKIE,
  type WorkspaceMode,
} from '@/lib/workspace-mode'

export const WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 90

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: WORKSPACE_COOKIE_MAX_AGE,
}

/** Set workspace cookies on a Route Handler response (reliable with redirect). */
export function applyWorkspaceCookiesToResponse(
  res: NextResponse,
  mode: WorkspaceMode,
  projectId?: string | null,
) {
  res.cookies.set(WORKSPACE_MODE_COOKIE, mode, COOKIE_OPTIONS)
  if (mode === 'projects' && projectId) {
    res.cookies.set(PROJECT_ID_COOKIE, projectId, COOKIE_OPTIONS)
  } else {
    res.cookies.delete(PROJECT_ID_COOKIE)
  }
}
