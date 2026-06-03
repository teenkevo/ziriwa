import { SupervisorWorkspacePage } from '@/features/manager/supervisor-workspace-page'

export default function SupervisorStakeholdersPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  return (
    <SupervisorWorkspacePage view='stakeholders' searchParams={searchParams} />
  )
}
