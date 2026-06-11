import { IMPERSONATION_COOKIE_NAME } from '@/lib/impersonation/constants'

export { IMPERSONATION_COOKIE_NAME }

export function impersonationCookieClearOptions() {
  return {
    name: IMPERSONATION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
