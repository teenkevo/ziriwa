/** Set `MAINTENANCE_MODE=true` to show the maintenance page for all app routes. */
export function isMaintenanceModeEnabled(): boolean {
  return process.env.MAINTENANCE_MODE === 'true'
}

/** Optional override for the default maintenance copy. */
export function getMaintenanceMessage(): string | undefined {
  const message = process.env.MAINTENANCE_MESSAGE?.trim()
  return message || undefined
}
