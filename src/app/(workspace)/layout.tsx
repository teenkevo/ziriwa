export const dynamic = 'force-dynamic'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Workspace | Ziriwa',
  description: 'Choose your workspace',
}

export default function WorkspaceRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
