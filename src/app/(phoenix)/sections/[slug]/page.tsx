import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { SectionPageContent } from '@/features/sections/section-page-content'
import { loadSectionWorkspaceData } from '@/features/sections/load-section-workspace-data'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadSectionWorkspaceData(slug, { workContext })

  if (!data) notFound()

  return (
    <Suspense fallback={null}>
      <SectionPageContent {...data} />
    </Suspense>
  )
}
