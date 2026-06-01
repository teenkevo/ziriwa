import type { WorkContextMode } from '@/lib/section-access'

export function parseWorkContextParam(
  value: string | string[] | undefined,
): WorkContextMode {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === 'acting' ? 'acting' : 'own'
}
