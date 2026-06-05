import { redirect } from 'next/navigation'

export default async function ProjectAdminStaffRedirectPage({
  params,
}: {
  params: Promise<{ projectSlug: string }>
}) {
  const { projectSlug } = await params
  redirect(`/projects/${encodeURIComponent(projectSlug)}/admin/members`)
}
