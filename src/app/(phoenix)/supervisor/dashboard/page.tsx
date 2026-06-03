import { SupervisorWorkspacePage } from '@/features/manager/supervisor-workspace-page'

export default function SupervisorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  return <SupervisorWorkspacePage view='dashboard' searchParams={searchParams} />
}
