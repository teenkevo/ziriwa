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

export function parseStartsAt(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const ms = Date.parse(trimmed)
  if (!Number.isFinite(ms)) return undefined
  return new Date(ms).toISOString()
}

export function isBeforeStartsAt(startsAt?: string, now = Date.now()): boolean {
  if (!startsAt) return false
  return now < Date.parse(startsAt)
}

export function getMsUntil(iso?: string, now = Date.now()): number {
  if (!iso) return 0
  return Math.max(0, Date.parse(iso) - now)
}

export function formatCountdownDuration(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1_000))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => value.toString().padStart(2, '0')

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${minutes}:${pad(seconds)}`
}

export function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export function parseDatetimeLocalValue(value: string): string | undefined {
  return parseStartsAt(value)
}

export function formatStartsAtLabel(startsAt: string): string {
  return new Date(startsAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
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
