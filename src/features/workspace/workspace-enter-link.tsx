'use client'

import * as React from 'react'

import { WorkspaceOptionRow } from '@/features/workspace/workspace-option-row'

interface WorkspaceEnterLinkProps {
  href: string
  icon: React.ReactNode
  name: string
  meta?: string
  actionLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * Full document navigation to /workspace/enter (reliable Set-Cookie) with instant loading UI.
 */
export function WorkspaceEnterLink({
  href,
  icon,
  name,
  meta,
  actionLabel = 'Open',
  disabled = false,
  className,
}: WorkspaceEnterLinkProps) {
  const [isOpening, setIsOpening] = React.useState(false)

  function handleOpen() {
    if (disabled || isOpening) return
    setIsOpening(true)
    window.location.assign(href)
  }

  return (
    <WorkspaceOptionRow
      icon={icon}
      name={name}
      meta={meta}
      actionLabel={actionLabel}
      className={className}
      disabled={disabled}
      loading={isOpening}
      onClick={handleOpen}
    />
  )
}
