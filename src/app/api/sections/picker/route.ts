import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { assertAuth } from '@/lib/authz/guards.server'

export interface SectionPickerOption {
  _id: string
  name: string
  slug?: string
  divisionName?: string
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(req.url)
    const excludeSectionId = searchParams.get('excludeSectionId')?.trim()
    const q = searchParams.get('q')?.trim().toLowerCase()

    let sections = await client.fetch<SectionPickerOption[]>(
      /* groq */ `*[_type == "section"] | order(name asc) {
        _id,
        name,
        "slug": slug.current,
        "divisionName": division->coalesce(acronym, fullName, name)
      }`,
    )

    if (excludeSectionId) {
      sections = sections.filter(s => s._id !== excludeSectionId)
    }

    if (q) {
      sections = sections.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.divisionName?.toLowerCase().includes(q),
      )
    }

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('GET sections/picker', error)
    return NextResponse.json(
      { error: 'Failed to load sections' },
      { status: 500 },
    )
  }
}
