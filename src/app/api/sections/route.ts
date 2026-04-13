import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'
import { canCreateSection } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAppRole()
    if (!canCreateSection(role)) {
      return NextResponse.json(
        {
          error:
            'Only assistant commissioners and commissioners can create sections',
        },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { name, divisionId, managerId, order } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Section name is required' },
        { status: 400 },
      )
    }
    if (!divisionId || typeof divisionId !== 'string') {
      return NextResponse.json(
        { error: 'Division is required' },
        { status: 400 },
      )
    }
    if (!managerId || typeof managerId !== 'string') {
      return NextResponse.json(
        { error: 'Manager is required' },
        { status: 400 },
      )
    }

    const baseSlug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const slug = await generateUniqueSlug(baseSlug, 'section')

    const doc = {
      _type: 'section',
      name: name.trim(),
      slug: { _type: 'slug', current: slug },
      division: { _type: 'reference', _ref: divisionId },
      manager: { _type: 'reference', _ref: managerId },
      ...(typeof order === 'number' && { order }),
    }

    const result = await writeClient.create(doc)

    await writeClient
      .patch(managerId)
      .set({ section: { _type: 'reference', _ref: result._id } })
      .commit()

    return NextResponse.json(
      { id: result._id, name: name.trim(), slug },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating section', error)
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 },
    )
  }
}
