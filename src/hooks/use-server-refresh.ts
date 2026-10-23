'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useTransition } from 'react'

/**
 * Runs a router update inside a transition and resolves when that update commits.
 * `router.refresh()` and `router.push()` do not return promises. Awaiting
 * `refresh()` or `runTransition()` keeps submit loaders visible until the new
 * server render is on screen.
 */
export function useServerRefresh() {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const resolversRef = useRef<Array<() => void>>([])
  const isRefreshingRef = useRef(isRefreshing)
  isRefreshingRef.current = isRefreshing

  const flush = useCallback(() => {
    const resolvers = resolversRef.current
    if (resolvers.length === 0) return
    resolversRef.current = []
    for (const resolve of resolvers) resolve()
  }, [])

  useEffect(() => {
    if (!isRefreshing) flush()
    return () => {
      // The closure flag belongs to the effect being cleaned up. A refresh that
      // just started (false -> true) must not resolve here.
      if (isRefreshing) flush()
    }
  }, [flush, isRefreshing])

  const runTransition = useCallback((update: () => void) => {
    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }
      resolversRef.current.push(finish)
      startTransition(update)
      // If the transition never stays pending, release the caller on the next frame.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!isRefreshingRef.current) finish()
        })
      })
    })
  }, [])

  const refresh = useCallback(() => {
    return runTransition(() => {
      router.refresh()
    })
  }, [router, runTransition])

  return { router, isRefreshing, refresh, runTransition }
}
