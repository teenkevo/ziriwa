'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface AnimatedExpandProps {
  open: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Smoothly expands/collapses form height only (no opacity fade).
 */
export function AnimatedExpand({
  open,
  children,
  className,
}: AnimatedExpandProps) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key='animated-expand'
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div className={className}>{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
