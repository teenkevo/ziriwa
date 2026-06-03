import { SupervisorWorkspacePage } from '@/features/manager/supervisor-workspace-page'

export default function SupervisorStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  return <SupervisorWorkspacePage view='staff' searchParams={searchParams} />
}
