import type { WorkContextMode } from '@/lib/section-access'

export function buildWorkContextHref(
  pathname: string,
  workContext: WorkContextMode,
  current: URLSearchParams,
): string {
  const params = new URLSearchParams(current.toString())
  if (workContext === 'acting') params.set('workContext', 'acting')
  else params.delete('workContext')
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
