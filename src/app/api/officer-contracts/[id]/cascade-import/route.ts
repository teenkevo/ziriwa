import { NextRequest, NextResponse } from 'next/server'

import { buildOfficerImport } from '@/lib/contract-cascade/build-officer-import'
import { normalizeCascadeRewrites } from '@/lib/contract-cascade/extract-cascade-context'
import { normalizeOfficerCascadeSelections } from '@/lib/contract-cascade/officer-cascade-selection'
import {
  OfficerCascadeImportContextError,
  loadOfficerCascadeImportContext,
} from '@/lib/contract-cascade/load-officer-cascade-import-context.server'
import { syncManagerTaskAssigneesFromOfficerCascade } from '@/lib/contract-cascade/resolve-manager-task-assignees.server'
import { syncSupervisorTaskAssigneesFromOfficerCascade } from '@/lib/contract-cascade/resolve-supervisor-task-assignees.server'
import { writeClient } from '@/sanity/lib/write-client'

/**
 * POST /api/officer-contracts/[id]/cascade-import
 * Body: { selections, rewrites?, supervisorContractId? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: officerContractId } = await params
    const body = await req.json()
    const selections = normalizeOfficerCascadeSelections(body.selections)

    if (!selections) {
      return NextResponse.json(
        {
          error:
            'selections is required: array of { initiativeKey, activities: [{ activityKey, taskKeys }] }',
        },
        { status: 400 },
      )
    }

    const context = await loadOfficerCascadeImportContext(
      officerContractId,
      selections,
      typeof body.supervisorContractId === 'string'
        ? body.supervisorContractId
        : null,
    )

    const normalizedRewrites = body.rewrites
      ? normalizeCascadeRewrites(body.rewrites, selections)
      : null
    if (body.rewrites && !normalizedRewrites) {
      return NextResponse.json(
        { error: 'Invalid rewrites payload' },
        { status: 400 },
      )
    }

    const rewriteMap = normalizedRewrites
      ? Object.fromEntries(
          normalizedRewrites.map(rewrite => [rewrite.activityKey, rewrite]),
        )
      : undefined

    const { objectives, importedActivityKeys, importedTaskKeys, skipped } =
      buildOfficerImport({
      supervisorObjectives: context.supervisorObjectives,
      supervisorContractId: context.supervisorContractId,
      officerStaffId: context.officerStaffId,
      cascadeRevision: context.cascadeRevision,
      selections,
      existingObjectives: context.officerObjectives,
      rewrites: rewriteMap,
    })

    if (importedTaskKeys.length === 0) {
      return NextResponse.json(
        {
          error: 'No items were imported',
          skipped,
        },
        { status: 400 },
      )
    }

    await writeClient.patch(officerContractId).set({ objectives }).commit()

    await syncSupervisorTaskAssigneesFromOfficerCascade(
      context.supervisorContractId,
      context.officerStaffId,
      selections,
    )

    await syncManagerTaskAssigneesFromOfficerCascade(
      context.supervisorContractId,
      context.officerStaffId,
      selections,
    )

    return NextResponse.json({
      ok: true,
      importedActivityKeys,
      importedTaskKeys,
      skipped,
    })
  } catch (error) {
    if (error instanceof OfficerCascadeImportContextError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }
    console.error('Error cascading from supervisor contract', error)
    return NextResponse.json(
      { error: 'Failed to cascade from supervisor contract' },
      { status: 500 },
    )
  }
}
