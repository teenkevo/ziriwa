import { ProjectWorkstreamsPage } from '@/features/projects/project-workstreams-page'

interface PageProps {
  params: Promise<{ projectSlug: string; role: string }>
}

export default async function Page({ params }: PageProps) {
  const { projectSlug, role } = await params
  return <ProjectWorkstreamsPage projectSlug={projectSlug} roleSegment={role} />
}
