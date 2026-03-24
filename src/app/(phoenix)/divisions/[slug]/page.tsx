import { notFound } from 'next/navigation'
import { getDivisionBySlug } from '@/sanity/lib/divisions/get-division-by-slug'
import { getSectionsByDivision } from '@/sanity/lib/sections/get-sections-by-division'
import { getManagersByDivision } from '@/sanity/lib/staff/get-managers'
import { DivisionPageContent } from '@/features/divisions/division-page-content'

export default async function DivisionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const division = await getDivisionBySlug(slug)

  if (!division) notFound()

  const [sections, managers] = await Promise.all([
    getSectionsByDivision(division._id),
    getManagersByDivision(division._id),
  ])

  return (
    <DivisionPageContent
      division={division}
      sections={sections}
      managers={managers}
    />
  )
}
