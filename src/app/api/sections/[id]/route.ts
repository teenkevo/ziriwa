import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { purgeSectionCascade } from '@/sanity/lib/cascade-delete'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'
import { canCreateSection } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'

const staffRef = (id: string) => ({ _type: 'reference' as const, _ref: id })

type SectionDoc = {
  _id: string
  name: string
  division?: { _id: string }
  manager?: { _id: string }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
            'Only assistant commissioners and commissioners can update sections',
        },
        { status: 403 },
      )
    }

    const { id } = await params
    const body = await req.json()
    const { name, managerId, divisionId, order } = body as {
      name?: string
      managerId?: string
      divisionId?: string
      order?: number
    }

    const current = await writeClient.fetch<SectionDoc | null>(
      `*[_type == "section" && _id == $id][0]{
        _id,
        name,
        division->{ _id },
        manager->{ _id }
      }`,
      { id },
    )

    if (!current) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const patch = writeClient.patch(id)
    let newSlug: string | undefined
    let didPatch = false

    if (typeof name === 'string' && name.trim() && name.trim() !== current.name) {
      const trimmed = name.trim()
      const baseSlug = trimmed
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      newSlug = await generateUniqueSlug(baseSlug, 'section', id)
      patch.set({
        name: trimmed,
        slug: { _type: 'slug', current: newSlug },
      })
      didPatch = true
    }

    if (
      typeof divisionId === 'string' &&
      divisionId !== current.division?._id
    ) {
      const targetDept = await writeClient.fetch<string | null>(
        `*[_type == "division" && _id == $divId][0].department._ref`,
        { divId: divisionId },
      )
      const currentDept =
        current.division?._id != null
          ? await writeClient.fetch<string | null>(
              `*[_type == "division" && _id == $divId][0].department._ref`,
              { divId: current.division._id },
            )
          : null
      if (!targetDept || targetDept !== currentDept) {
        return NextResponse.json(
          {
            error:
              'Section can only be moved to divisions within the same department.',
          },
          { status: 400 },
        )
      }
      patch.set({ division: staffRef(divisionId) })
      didPatch = true
    }

    if (typeof order === 'number') {
      patch.set({ order })
      didPatch = true
    }

    const managerChanged =
      typeof managerId === 'string' &&
      managerId !== (current.manager?._id ?? '')

    if (managerChanged) {
      patch.set({ manager: staffRef(managerId) })
      didPatch = true
    }

    if (!didPatch) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 },
      )
    }

    await patch.commit()

    if (managerChanged) {
      if (current.manager?._id) {
        await writeClient.patch(current.manager._id).unset(['section']).commit()
      }
      await writeClient
        .patch(managerId)
        .set({ section: staffRef(id) })
        .commit()
    }

    return NextResponse.json({
      ok: true,
      ...(newSlug && { slug: newSlug }),
    })
  } catch (error) {
    console.error('Error updating section', error)
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
            'Only assistant commissioners and commissioners can delete sections',
        },
        { status: 403 },
      )
    }

    const { id } = await params

    const section = await writeClient.fetch<SectionDoc | null>(
      `*[_type == "section" && _id == $id][0]{ _id }`,
      { id },
    )

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    await purgeSectionCascade(writeClient, id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting section', error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 },
    )
  }
}
