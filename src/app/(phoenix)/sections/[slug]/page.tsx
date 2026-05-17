import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { SectionPageContent } from '@/features/sections/section-page-content'
import { loadSectionWorkspaceData } from '@/features/sections/load-section-workspace-data'

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await loadSectionWorkspaceData(slug)

  if (!data) notFound()

  return (
    <Suspense fallback={null}>
      <SectionPageContent {...data} />
    </Suspense>
  )
}
