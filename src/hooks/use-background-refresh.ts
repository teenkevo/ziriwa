'use client'

import * as React from 'react'

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000
const MIN_REFRESH_GAP_MS = 30 * 1000

interface UseBackgroundRefreshOptions {
  /** When false, no mount load, polling, or focus refresh. */
  enabled?: boolean
  /** Background poll interval while the tab is visible. Set to 0 to disable polling. */
  pollIntervalMs?: number
  /** Fetch once when the hook mounts (default true). */
  refreshOnMount?: boolean
}

/**
 * Runs an initial refresh and optional background polling only while the tab is
 * visible, with a minimum gap between focus-driven refreshes.
 */
export function useBackgroundRefresh(
  refresh: () => void | Promise<void>,
  {
    enabled = true,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    refreshOnMount = true,
  }: UseBackgroundRefreshOptions = {},
) {
  const refreshRef = React.useRef(refresh)
  const lastRefreshAtRef = React.useRef(0)

  refreshRef.current = refresh

  const runRefresh = React.useCallback((force = false) => {
    if (!enabled) return
    const now = Date.now()
    if (!force && now - lastRefreshAtRef.current < MIN_REFRESH_GAP_MS) return
    lastRefreshAtRef.current = now
    void refreshRef.current()
  }, [enabled])

  React.useEffect(() => {
    if (!enabled) return

    if (refreshOnMount) {
      runRefresh(true)
    }

    if (pollIntervalMs <= 0) return

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runRefresh()
      }
    }

    const onWindowFocus = () => {
      runRefresh()
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        runRefresh(true)
      }
    }, pollIntervalMs)

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onWindowFocus)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [enabled, pollIntervalMs, refreshOnMount, runRefresh])

  return { refresh: () => runRefresh(true) }
}
