'use client'

import * as React from 'react'

import { WorkspaceRouteLink } from '@/components/workspace-route-link'

interface SprintTabSidebarLinkProps
  extends Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> {
  href: string
}

export function SprintTabSidebarLink({
  href,
  ...props
}: SprintTabSidebarLinkProps) {
  return <WorkspaceRouteLink href={href} {...props} />
}
