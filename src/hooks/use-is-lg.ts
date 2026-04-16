'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** SSR: assume not lg (mobile sheet for sprint details). */
function getServerSnapshot() {
  return false
}

/** Tailwind `lg` breakpoint (1024px). */
export function useIsLg() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
