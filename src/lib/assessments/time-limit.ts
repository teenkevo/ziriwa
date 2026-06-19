/** Grace period after expiresAt before the server rejects manual submissions. */
export const ASSESSMENT_SUBMIT_GRACE_MS = 5_000

export function computeExpiresAt(
  startedAt: string,
  timeLimitMinutes: number,
): string {
  return new Date(
    Date.parse(startedAt) + timeLimitMinutes * 60 * 1_000,
  ).toISOString()
}

export function isPastDueDate(dueDate?: string, today = new Date()): boolean {
  if (!dueDate) return false
  const todayKey = today.toISOString().slice(0, 10)
  return dueDate < todayKey
}

export function isAttemptExpired(
  expiresAt?: string,
  now = Date.now(),
): boolean {
  if (!expiresAt) return false
  return now > Date.parse(expiresAt) + ASSESSMENT_SUBMIT_GRACE_MS
}

export function getRemainingMs(expiresAt: string, now = Date.now()): number {
  return Math.max(0, Date.parse(expiresAt) - now)
}

export function formatTimeRemaining(totalMs: number): string {
  const totalSeconds = Math.ceil(totalMs / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatTimeLimitMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `${hours} hr`
  return `${hours} hr ${remainder} min`
}

export function parseTimeLimitMinutes(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}
