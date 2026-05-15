function parseCsv(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Emails allowed to manage users (invite, assign roles).
 * Set `SUPERADMIN_EMAILS` (comma-separated) and/or `BOOTSTRAP_ADMIN_EMAIL`.
 */
export function getSuperadminEmailWhitelist(): string[] {
  const fromList = parseCsv(process.env.SUPERADMIN_EMAILS)
  const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const set = new Set(fromList)
  if (bootstrap) set.add(bootstrap)
  return [...set]
}
