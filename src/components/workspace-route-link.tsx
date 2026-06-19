'use client'

import Link from 'next/link'
import * as React from 'react'

import { useWorkspaceRouteNavigationOptional } from '@/contexts/workspace-route-navigation-context'

function isModifiedClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
}

interface WorkspaceRouteLinkProps
  extends Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> {
  href: string
}

export const WorkspaceRouteLink = React.forwardRef<
  HTMLAnchorElement,
  WorkspaceRouteLinkProps
>(function WorkspaceRouteLink({ href, onClick, ...props }, ref) {
  const navigation = useWorkspaceRouteNavigationOptional()

  if (!navigation) {
    return <Link ref={ref} href={href} onClick={onClick} {...props} />
  }

  return (
    <a
      ref={ref}
      href={href}
      {...props}
      onClick={event => {
        onClick?.(event)
        if (event.defaultPrevented || isModifiedClick(event)) {
          return
        }
        event.preventDefault()
        navigation.navigateToHref(href)
      }}
    />
  )
})
