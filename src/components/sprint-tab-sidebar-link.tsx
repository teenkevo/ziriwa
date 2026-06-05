'use client'

import Link from 'next/link'
import * as React from 'react'

import { useWorkspaceRouteNavigationOptional } from '@/contexts/workspace-route-navigation-context'

interface SprintTabSidebarLinkProps
  extends Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> {
  href: string
}

export function SprintTabSidebarLink({
  href,
  onClick,
  ...props
}: SprintTabSidebarLinkProps) {
  const navigation = useWorkspaceRouteNavigationOptional()

  if (!navigation) {
    return <Link href={href} onClick={onClick} {...props} />
  }

  return (
    <a
      href={href}
      {...props}
      onClick={event => {
        onClick?.(event)
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return
        }
        event.preventDefault()
        navigation.navigateToHref(href)
      }}
    />
  )
}
