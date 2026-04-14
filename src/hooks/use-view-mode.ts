'use client'

import * as React from 'react'

export type ViewMode = 'grid' | 'table'

export function useViewMode(
  storageKey: string,
  defaultMode: ViewMode = 'grid',
) {
  const [mode, setModeState] = React.useState<ViewMode>(defaultMode)

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey) as ViewMode | null
      if (v === 'grid' || v === 'table') setModeState(v)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const setMode = React.useCallback(
    (next: ViewMode) => {
      setModeState(next)
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  )

  return { mode, setMode }
}
