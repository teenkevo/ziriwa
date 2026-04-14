import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { purgeDepartmentCascade } from '@/sanity/lib/cascade-delete'
import { hasRoleAtLeast } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'

function staffRef(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

type DepartmentDoc = {
  _id: string
  commissioner?: { _id: string }
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
        { error: 'Only commissioners can update departments' },
        { status: 403 },
      )
    }

    const { id } = await params
    const body = await req.json()
    const { fullName, acronym, commissionerId, isDefault } = body as {
      fullName?: string
      acronym?: string | null
      commissionerId?: string | null
      isDefault?: boolean
    }

    const current = await writeClient.fetch<DepartmentDoc | null>(
      `*[_type == "department" && _id == $id][0]{ _id, commissioner->{ _id } }`,
      { id },
    )

    if (!current) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

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

    const oldCommId = current.commissioner?._id

    if (commissionerId !== undefined) {
      const newCommId =
        commissionerId === null || commissionerId === ''
          ? null
          : commissionerId

      if (oldCommId && oldCommId !== newCommId) {
        await writeClient.patch(oldCommId).unset(['department']).commit()
      }

      if (newCommId) {
        if (oldCommId !== newCommId) {
          await writeClient
            .patch(newCommId)
            .set({ department: staffRef(id) })
            .commit()
        }
        patch.set({ commissioner: staffRef(newCommId) })
      } else {
        patch.unset(['commissioner'])
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
        `*[_type == "department" && _id != $id && isDefault == true]._id`,
        { id },
      )
      for (const otherId of others) {
        await writeClient.patch(otherId).set({ isDefault: false }).commit()
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating department', error)
    return NextResponse.json(
      { error: 'Failed to update department' },
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
        { error: 'Only commissioners can delete departments' },
        { status: 403 },
      )
    }

    const { id } = await params

    const exists = await writeClient.fetch<string | null>(
      `*[_type == "department" && _id == $id][0]._id`,
      { id },
    )

    if (!exists) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    await purgeDepartmentCascade(writeClient, id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting department', error)
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 },
    )
  }
}
