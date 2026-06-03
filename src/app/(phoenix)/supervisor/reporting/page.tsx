import { SupervisorWorkspacePage } from '@/features/manager/supervisor-workspace-page'

export default function SupervisorReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  return <SupervisorWorkspacePage view='reporting' searchParams={searchParams} />
}
