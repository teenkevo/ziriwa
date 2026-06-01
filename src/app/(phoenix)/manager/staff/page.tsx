import { ManagerWorkspacePage } from '@/features/manager/manager-workspace-page'

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  return <ManagerWorkspacePage view='staff' searchParams={searchParams} />
}
