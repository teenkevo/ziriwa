import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getAllDivisions } from '@/sanity/lib/divisions/get-all-divisions'

export async function GET() {
  try {
    const divisions = await getAllDivisions()
    return NextResponse.json(divisions)
  } catch (error) {
    console.error('Error fetching divisions', error)
    return NextResponse.json(
      { error: 'Failed to fetch divisions' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, acronym, assistantCommissionerId } = body

    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json(
        { error: 'Full division name is required' },
        { status: 400 },
      )
    }

    const slugSource = (acronym || fullName).trim()
    const slug = slugSource
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const doc = {
      _type: 'division',
      fullName: fullName.trim(),
      ...(acronym && { acronym: acronym.trim() }),
      slug: { _type: 'slug', current: slug },
      isDefault: false,
      ...(assistantCommissionerId && {
        assistantCommissioner: {
          _type: 'reference',
          _ref: assistantCommissionerId,
        },
      }),
    }

    const result = await writeClient.create(doc)

    return NextResponse.json(
      { id: result._id, slug: doc.slug.current },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating division', error)
    return NextResponse.json(
      { error: 'Failed to create division' },
      { status: 500 },
    )
  }
}
