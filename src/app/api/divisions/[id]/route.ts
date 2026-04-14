import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { purgeDivisionCascade } from '@/sanity/lib/cascade-delete'
import { hasRoleAtLeast } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'

const staffRef = (id: string) => ({ _type: 'reference' as const, _ref: id })

type DivisionDoc = {
  _id: string
  department?: { _id: string }
  assistantCommissioner?: { _id: string }
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
    if (!hasRoleAtLeast(role, 'commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can update divisions' },
        { status: 403 },
      )
    }

    const { id } = await params
    const body = await req.json()
    const { fullName, acronym, assistantCommissionerId, isDefault } = body as {
      fullName?: string
      acronym?: string | null
      assistantCommissionerId?: string | null
      isDefault?: boolean
    }

    const current = await writeClient.fetch<DivisionDoc | null>(
      `*[_type == "division" && _id == $id][0]{
        _id,
        department->{ _id },
        assistantCommissioner->{ _id }
      }`,
      { id },
    )

    if (!current) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    const departmentId = current.department?._id
    if (!departmentId) {
      return NextResponse.json(
        { error: 'Division has no department' },
        { status: 400 },
      )
    }

    const oldAcId = current.assistantCommissioner?._id

    const patch = writeClient.patch(id)
    let didPatch = false

    if (typeof fullName === 'string' && fullName.trim()) {
      patch.set({ fullName: fullName.trim() })
      didPatch = true
    }
    if (acronym !== undefined) {
      if (acronym === null || acronym === '') {
        patch.unset(['acronym'])
      } else {
        patch.set({ acronym: String(acronym).trim() })
      }
      didPatch = true
    }
    if (typeof isDefault === 'boolean') {
      patch.set({ isDefault })
      didPatch = true
    }

    if (assistantCommissionerId !== undefined) {
      if (assistantCommissionerId === null || assistantCommissionerId === '') {
        patch.unset(['assistantCommissioner'])
      } else {
        patch.set({
          assistantCommissioner: staffRef(assistantCommissionerId),
        })
      }
      didPatch = true
    }

    if (!didPatch) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 },
      )
    }

    await patch.commit()

    if (isDefault === true) {
      const others = await writeClient.fetch<string[]>(
        `*[_type == "division" && department._ref == $deptId && _id != $id]._id`,
        { deptId: departmentId, id },
      )
      for (const otherId of others) {
        await writeClient.patch(otherId).set({ isDefault: false }).commit()
      }
    }

    if (assistantCommissionerId !== undefined) {
      if (oldAcId && oldAcId !== assistantCommissionerId) {
        await writeClient.patch(oldAcId).unset(['division']).commit()
      }
      if (assistantCommissionerId && assistantCommissionerId !== oldAcId) {
        await writeClient
          .patch(assistantCommissionerId)
          .set({
            division: staffRef(id),
            department: staffRef(departmentId),
          })
          .commit()
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating division', error)
    return NextResponse.json(
      { error: 'Failed to update division' },
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
    if (!hasRoleAtLeast(role, 'commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can delete divisions' },
        { status: 403 },
      )
    }

    const { id } = await params

    const exists = await writeClient.fetch<string | null>(
      `*[_type == "division" && _id == $id][0]._id`,
      { id },
    )

    if (!exists) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    await purgeDivisionCascade(writeClient, id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting division', error)
    return NextResponse.json(
      { error: 'Failed to delete division' },
      { status: 500 },
    )
  }
}
