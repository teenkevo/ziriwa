import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { purgeSectionCascade } from '@/sanity/lib/cascade-delete'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'
import { audit } from '@/lib/audit-log/events'
import { assertAuth, assertPermission } from '@/lib/authz/guards.server'

const staffRef = (id: string) => ({ _type: 'reference' as const, _ref: id })

type SectionDoc = {
  _id: string
  name: string
  isPlanningSection?: boolean
  division?: { _id: string }
  manager?: { _id: string }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult
    const denied = await assertPermission(
      'sections',
      'update',
      'Only assistant commissioners and commissioners can update sections',
    )
    if (denied) return denied

    const { id } = await params
    const body = await req.json()
    const { name, managerId, divisionId, order, isPlanningSection } = body as {
      name?: string
      managerId?: string | null
      divisionId?: string
      order?: number
      isPlanningSection?: boolean
    }

    const current = await writeClient.fetch<SectionDoc | null>(
      `*[_type == "section" && _id == $id][0]{
        _id,
        name,
        isPlanningSection,
        division->{ _id },
        manager->{ _id }
      }`,
      { id },
    )

    if (!current) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const nextIsPlanning =
      typeof isPlanningSection === 'boolean'
        ? isPlanningSection
        : Boolean(current.isPlanningSection)

    if (!nextIsPlanning) {
      const nextManagerId =
        managerId === null
          ? null
          : typeof managerId === 'string'
            ? managerId
            : (current.manager?._id ?? null)
      if (!nextManagerId) {
        return NextResponse.json(
          { error: 'Manager is required for standard sections' },
          { status: 400 },
        )
      }
    }

    const patch = writeClient.patch(id)
    let newSlug: string | undefined
    let didPatch = false
    const unsetPaths: string[] = []

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

    if (
      typeof isPlanningSection === 'boolean' &&
      isPlanningSection !== Boolean(current.isPlanningSection)
    ) {
      patch.set({ isPlanningSection })
      didPatch = true
    }

    const previousManagerId = current.manager?._id ?? null
    let nextManagerId: string | null | undefined = undefined
    let clearManager = false

    if (nextIsPlanning) {
      if (previousManagerId) {
        clearManager = true
        nextManagerId = null
      }
    } else if (typeof managerId === 'string') {
      if (managerId !== previousManagerId) {
        nextManagerId = managerId
      }
    }

    if (clearManager) {
      unsetPaths.push('manager')
      didPatch = true
    } else if (typeof nextManagerId === 'string') {
      patch.set({ manager: staffRef(nextManagerId) })
      didPatch = true
    }

    if (!didPatch) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 },
      )
    }

    if (unsetPaths.length > 0) {
      patch.unset(unsetPaths)
    }
    await patch.commit()

    if (clearManager && previousManagerId) {
      await writeClient.patch(previousManagerId).unset(['section']).commit()
    } else if (
      typeof nextManagerId === 'string' &&
      nextManagerId !== previousManagerId
    ) {
      if (previousManagerId) {
        await writeClient.patch(previousManagerId).unset(['section']).commit()
      }
      await writeClient
        .patch(nextManagerId)
        .set({ section: staffRef(id) })
        .commit()
    }

    audit.section.updated(id, current.name, {
      name,
      managerId,
      divisionId,
      order,
      isPlanningSection,
    })

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
    const authResult = await assertAuth()
    if (authResult instanceof NextResponse) return authResult
    const denied = await assertPermission(
      'sections',
      'delete',
      'Only assistant commissioners and commissioners can delete sections',
    )
    if (denied) return denied

    const { id } = await params

    const section = await writeClient.fetch<SectionDoc | null>(
      `*[_type == "section" && _id == $id][0]{ _id, name }`,
      { id },
    )

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    await purgeSectionCascade(writeClient, id)
    audit.section.deleted(id, section.name)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting section', error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 },
    )
  }
}
