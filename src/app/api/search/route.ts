import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'

export const dynamic = 'force-dynamic'

function sanitizePattern(q: string): string {
  const t = q.trim().toLowerCase().slice(0, 80)
  if (t.length < 2) return ''
  return `*${t.replace(/[*\\]/g, '')}*`
}

const searchQuery = `{
  "departments": *[_type == "department" && (
    lower(coalesce(fullName, name, "")) match $pat ||
    lower(coalesce(acronym, "")) match $pat
  )] | order(coalesce(fullName, name) asc) [0...6] {
    _id,
    "title": coalesce(fullName, name),
    slug
  },
  "divisions": *[_type == "division" && (
    lower(coalesce(fullName, name, "")) match $pat ||
    lower(coalesce(acronym, "")) match $pat
  )] | order(coalesce(fullName, name) asc) [0...6] {
    _id,
    "title": coalesce(fullName, name),
    slug
  },
  "sections": *[_type == "section" && lower(name) match $pat] | order(name asc) [0...6] {
    _id,
    "title": name,
    slug
  },
  "people": *[_type == "staff" && status == "active" && (
    lower(coalesce(fullName, firstName + " " + lastName, "")) match $pat ||
    lower(coalesce(staffId, "")) match $pat ||
    lower(coalesce(email, "")) match $pat
  )] | order(coalesce(fullName, firstName + " " + lastName) asc) [0...8] {
    _id,
    "title": coalesce(fullName, firstName + " " + lastName),
    "role": role,
    staffId,
    "department": department->{ slug },
    "division": division->{ slug },
    "section": section->{ slug, name }
  }
}`

export type GlobalSearchResponse = {
  departments: {
    _id: string
    title: string
    slug?: { current: string }
  }[]
  divisions: {
    _id: string
    title: string
    slug?: { current: string }
  }[]
  sections: {
    _id: string
    title: string
    slug?: { current: string }
  }[]
  people: {
    _id: string
    title: string
    role?: string
    staffId?: string
    department?: { slug?: { current: string } } | null
    division?: { slug?: { current: string } } | null
    section?: { slug?: { current: string }; name?: string } | null
  }[]
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? ''
    const pat = sanitizePattern(q)
    if (!pat) {
      const empty: GlobalSearchResponse = {
        departments: [],
        divisions: [],
        sections: [],
        people: [],
      }
      return NextResponse.json(empty)
    }

    const result = await client.fetch<GlobalSearchResponse>(searchQuery, {
      pat,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Global search error', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 },
    )
  }
}
