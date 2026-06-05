import { NextRequest, NextResponse } from 'next/server'

import { assertAuth } from '@/lib/authz/guards.server'
import { canManageProjectRoster } from '@/lib/project-onboarding-auth.server'
import { upsertWorkstreamLeadProjectMember } from '@/lib/project-workstream-lead.server'
import { client } from '@/sanity/lib/client'
import { purgeSectionCascade } from '@/sanity/lib/cascade-delete'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'
import { writeClient } from '@/sanity/lib/write-client'

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

async function getProjectWorkstream(
  projectId: string,
  workstreamId: string,
): Promise<{ _id: string; name: string; projectId: string } | null> {
  return client.fetch(
    /* groq */ `
      *[_type == "section" && _id == $workstreamId && project._ref == $projectId][0]{
        _id,
        name,
        "projectId": project._ref
      }
    `,
    { projectId, workstreamId },
  )
}

async function deactivateWorkstreamMembers(projectId: string, workstreamId: string) {
  const memberIds = await client.fetch<string[]>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && workstream._ref == $workstreamId
        && status == "active"
      ]._id
    `,
    { projectId, workstreamId },
  )

  for (const memberId of memberIds) {
    await writeClient.patch(memberId).set({ status: 'inactive' }).commit()
  }
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId, workstreamId } = await params
  if (!(await canManageProjectRoster(projectId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const workstream = await getProjectWorkstream(projectId, workstreamId)
  if (!workstream) {
    return NextResponse.json({ error: 'Workstream not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const workstreamLeadStaffId =
    typeof body.workstreamLeadStaffId === 'string'
      ? body.workstreamLeadStaffId.trim()
      : undefined

  if (!name && workstreamLeadStaffId === undefined) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
  }

  const patch = writeClient.patch(workstreamId)
  let newSlug: string | undefined
  let didPatch = false
  let needsPatchCommit = false

  if (name && name !== workstream.name) {
    const baseSlug = `${name}-ws`
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    newSlug = await generateUniqueSlug(baseSlug, 'section', workstreamId)
    patch.set({
      name,
      slug: { _type: 'slug', current: newSlug },
    })
    didPatch = true
    needsPatchCommit = true
  }

  if (workstreamLeadStaffId !== undefined) {
    if (workstreamLeadStaffId) {
      await upsertWorkstreamLeadProjectMember(
        projectId,
        workstreamId,
        workstreamLeadStaffId,
      )
    } else {
      patch.unset(['workstreamLead'])
      needsPatchCommit = true
    }
    didPatch = true
  }

  if (!didPatch) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
  }

  if (needsPatchCommit) {
    await patch.commit()
  }

  return NextResponse.json({
    ok: true,
    ...(newSlug && { slug: newSlug }),
  })
}

export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; workstreamId: string }> },
) {
  const authResult = await assertAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id: projectId, workstreamId } = await params
  if (!(await canManageProjectRoster(projectId))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const workstream = await getProjectWorkstream(projectId, workstreamId)
  if (!workstream) {
    return NextResponse.json({ error: 'Workstream not found' }, { status: 404 })
  }

  await deactivateWorkstreamMembers(projectId, workstreamId)
  await purgeSectionCascade(writeClient, workstreamId)

  return NextResponse.json({ ok: true })
}
