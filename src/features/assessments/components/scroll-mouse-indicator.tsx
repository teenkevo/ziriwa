'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ScrollMouseIndicatorProps {
  visible: boolean
}

export function ScrollMouseIndicator({ visible }: ScrollMouseIndicatorProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.25 }}
          className='pointer-events-none absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2 text-muted-foreground sm:right-6'
          aria-hidden
        >
          <div className='relative h-10 w-6 rounded-full border-2 border-current'>
            <motion.div
              className='absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 rounded-full bg-current'
              animate={{ y: [0, 8, 0], opacity: [1, 0.25, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
          <motion.span
            className='text-[10px] font-medium uppercase tracking-wider'
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            Scroll
          </motion.span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function useScrollHintActive(
  scrollRef: React.RefObject<HTMLElement | null>,
  resetKey: string | number,
) {
  const [canScrollDown, setCanScrollDown] = React.useState(false)

  const updateScrollHint = React.useCallback(() => {
    const element = scrollRef.current
    if (!element) {
      setCanScrollDown(false)
      return
    }

    const hasOverflow = element.scrollHeight > element.clientHeight + 8
    const atBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 16
    setCanScrollDown(hasOverflow && !atBottom)
  }, [scrollRef])

  React.useEffect(() => {
    updateScrollHint()
    const element = scrollRef.current
    if (!element) return

    const observer = new ResizeObserver(() => updateScrollHint())
    observer.observe(element)
    window.addEventListener('resize', updateScrollHint)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScrollHint)
    }
  }, [scrollRef, updateScrollHint, resetKey])

  return { canScrollDown, updateScrollHint }
}
