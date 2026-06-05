import 'server-only'

const DEFAULT_DEV_URL = 'http://localhost:3000'

/** Canonical app origin for Clerk redirects and absolute links (server-side). */
export function getAppBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.APP_URL?.trim()

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = vercel.replace(/\/$/, '')
    return host.startsWith('http') ? host : `https://${host}`
  }

  return DEFAULT_DEV_URL
}

export function getAuthContinueUrl(): string {
  return `${getAppBaseUrl()}/auth/continue`
}

/** Where Clerk sends invited users to finish sign-up (consumes __clerk_ticket). */
export function getInvitationAcceptUrl(): string {
  return `${getAppBaseUrl()}/sign-up`
}

export function getSignInUrl(): string {
  return `${getAppBaseUrl()}/sign-in`
}
