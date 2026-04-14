import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'

/**
 * Minimal section lookup for client nav (e.g. sidebar active division on section pages).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const section = await getSectionBySlug(decoded)

  if (!section?.division?._id) {
    return NextResponse.json({ division: null })
  }

  return NextResponse.json({
    division: {
      _id: section.division._id,
      slug: section.division.slug?.current ?? null,
    },
  })
}
