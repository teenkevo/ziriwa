import { OfficerWorkspacePage } from '@/features/manager/officer-workspace-page'

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  return (
    <OfficerWorkspacePage view='stakeholders' searchParams={searchParams} />
  )
}
