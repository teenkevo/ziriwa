import { NextResponse } from 'next/server'

import {
  FINANCIAL_YEAR_COOKIE,
  FINANCIAL_YEAR_COOKIE_MAX_AGE,
  FINANCIAL_YEAR_SESSION_COOKIE,
  getCurrentFinancialYear,
} from '@/lib/financial-year'

const COOKIE_OPTIONS = {
  path: '/',
  maxAge: FINANCIAL_YEAR_COOKIE_MAX_AGE,
  sameSite: 'lax' as const,
}

export function shouldResetFinancialYearForSession(
  request: {
    cookies: { get: (name: string) => { value: string } | undefined }
  },
  sessionId: string | null | undefined,
): boolean {
  if (!sessionId) return false
  return request.cookies.get(FINANCIAL_YEAR_SESSION_COOKIE)?.value !== sessionId
}

/** Bind the workspace FY to this Clerk session, starting on the calendar current year. */
export function bindFinancialYearCookieToSession(
  response: NextResponse,
  sessionId: string,
): NextResponse {
  const current = getCurrentFinancialYear()
  response.cookies.set(FINANCIAL_YEAR_COOKIE, current.label, COOKIE_OPTIONS)
  response.cookies.set(FINANCIAL_YEAR_SESSION_COOKIE, sessionId, COOKIE_OPTIONS)
  return response
}
