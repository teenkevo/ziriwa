import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { NotAuthorized } from '@/components/admin/not-authorized'
import { ProjectsAdminPage } from '@/features/admin/projects-admin-page'
import { canCreateProject } from '@/lib/authz/guards.server'
import { client } from '@/sanity/lib/client'

export const dynamic = 'force-dynamic'

export default async function AdminProjectsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!(await canCreateProject())) {
    return (
      <NotAuthorized
        title='Not authorized'
        description="You don't have access to project administration."
        hint='Project creation is limited to superadmin accounts (BOOTSTRAP_ADMIN_EMAIL or SUPERADMIN_EMAILS).'
      />
    )
  }

  const projects = await client.fetch<
    { _id: string; name: string; slug?: { current?: string } }[]
  >(
    /* groq */ `*[_type == "project" && coalesce(status, "active") == "active"] | order(name asc) {
      _id,
      name,
      slug
    }`,
  )

  return <ProjectsAdminPage initialProjects={projects} />
}
