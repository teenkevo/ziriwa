import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getAllDepartments } from '@/sanity/lib/departments/get-all-departments'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'
import { hasRoleAtLeast } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'

function staffRef(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

export async function GET() {
  try {
    const departments = await getAllDepartments()
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Error fetching departments', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAppRole()
    if (!hasRoleAtLeast(role, 'commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can create departments' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { fullName, acronym, commissionerId } = body

    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json(
        { error: 'Full department name is required' },
        { status: 400 },
      )
    }

    const slugSource = (acronym || fullName).trim()
    const baseSlug = slugSource
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const slug = await generateUniqueSlug(baseSlug, 'department')

    const doc = {
      _type: 'department',
      fullName: fullName.trim(),
      ...(acronym && { acronym: acronym.trim() }),
      slug: { _type: 'slug', current: slug },
      isDefault: false,
      ...(commissionerId && {
        commissioner: {
          _type: 'reference',
          _ref: commissionerId,
        },
      }),
    }

    const result = await writeClient.create(doc)

    if (commissionerId && typeof commissionerId === 'string') {
      await writeClient
        .patch(commissionerId)
        .set({ department: staffRef(result._id) })
        .commit()
    }

    return NextResponse.json(
      { id: result._id, slug },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating department', error)
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 },
    )
  }
}
