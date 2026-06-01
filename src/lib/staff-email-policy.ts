/**
 * Staff email domain policy (@ura.go.ug).
 *
 * Set `NEXT_PUBLIC_ENFORCE_URA_EMAIL=false` in `.env.local` to allow any email
 * while testing multiple roles. Remove or set to `true` before production.
 */
export const URA_EMAIL_SUFFIX = '@ura.go.ug'

export function isUraEmailEnforced(): boolean {
  return process.env.NEXT_PUBLIC_ENFORCE_URA_EMAIL !== 'false'
}

export function isAllowedStaffEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  if (!isUraEmailEnforced()) return true
  return normalized.endsWith(URA_EMAIL_SUFFIX)
}

export function staffEmailRequirementMessage(): string {
  return `Email must end with ${URA_EMAIL_SUFFIX}`
}

export function staffEmailFieldDescription(): string | undefined {
  return isUraEmailEnforced()
    ? `Must end with ${URA_EMAIL_SUFFIX}`
    : undefined
}
