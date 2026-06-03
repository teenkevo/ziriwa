import { SupervisorWorkspacePage } from '@/features/manager/supervisor-workspace-page'

export default function SupervisorContractPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  return <SupervisorWorkspacePage view='contract' searchParams={searchParams} />
}
