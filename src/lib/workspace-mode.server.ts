import 'server-only'

import { cookies } from 'next/headers'

import {
  PROJECT_ID_COOKIE,
  WORKSPACE_MODE_COOKIE,
  type WorkspaceMode,
  parseWorkspaceMode,
} from '@/lib/workspace-mode'

export async function getWorkspaceModeFromCookies(): Promise<WorkspaceMode | null> {
  const store = await cookies()
  return parseWorkspaceMode(store.get(WORKSPACE_MODE_COOKIE)?.value)
}

export async function getSelectedProjectIdFromCookies(): Promise<string | null> {
  const store = await cookies()
  const id = store.get(PROJECT_ID_COOKIE)?.value?.trim()
  return id || null
}

export async function getProjectWorkspaceContext(): Promise<{
  mode: WorkspaceMode
  projectId: string | null
  isProjects: boolean
}> {
  const mode = (await getWorkspaceModeFromCookies()) ?? 'mainstream'
  const projectId = await getSelectedProjectIdFromCookies()
  return {
    mode,
    projectId: mode === 'projects' ? projectId : null,
    isProjects: mode === 'projects' && Boolean(projectId),
  }
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90

/** @deprecated Cookies must be set via `applyWorkspaceCookiesToResponse` in Route Handlers. */
export async function setMainstreamWorkspaceCookies() {
  const store = await cookies()
  store.set(WORKSPACE_MODE_COOKIE, 'mainstream', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  store.delete(PROJECT_ID_COOKIE)
}

/** @deprecated Cookies must be set via `applyWorkspaceCookiesToResponse` in Route Handlers. */
export async function setProjectWorkspaceCookies(projectId: string) {
  const store = await cookies()
  store.set(WORKSPACE_MODE_COOKIE, 'projects', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  store.set(PROJECT_ID_COOKIE, projectId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}
