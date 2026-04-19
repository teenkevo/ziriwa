'use client'

import * as React from 'react'

/**
 * Client mirror of a server-rendered prop: stays in sync when the parent passes
 * new data (e.g. after router.refresh), while allowing instant local updates
 * after mutations without waiting for an RSC round-trip.
 */
export function useServerSyncedState<T>(
  serverSnapshot: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [local, setLocal] = React.useState(serverSnapshot)
  React.useEffect(() => {
    setLocal(serverSnapshot)
  }, [serverSnapshot])
  return [local, setLocal]
}
