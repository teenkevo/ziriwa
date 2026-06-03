import { NextRequest, NextResponse } from 'next/server'

import { buildSupervisorImport } from '@/lib/contract-cascade/build-supervisor-import'
import {
  normalizeCascadeRewrites,
  normalizeCascadeSelections,
} from '@/lib/contract-cascade/extract-cascade-context'
import {
  CascadeImportContextError,
  loadCascadeImportContext,
} from '@/lib/contract-cascade/load-cascade-import-context.server'
import { writeClient } from '@/sanity/lib/write-client'

/**
 * POST /api/supervisor-contracts/[id]/cascade-import
 * Body: { selections, rewrites?: CascadeActivityRewrite[] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: supervisorContractId } = await params
    const body = await req.json()
    const selections = normalizeCascadeSelections(body.selections)

    if (!selections) {
      return NextResponse.json(
        {
          error:
            'selections is required: array of { initiativeKey, activityKeys }',
        },
        { status: 400 },
      )
    }

    const context = await loadCascadeImportContext(
      supervisorContractId,
      selections,
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

    const { objectives, importedActivityKeys, skipped } = buildSupervisorImport(
      {
        managerObjectives: context.managerObjectives,
        sectionContractId: context.sectionContractId,
        cascadeRevision: context.cascadeRevision,
        selections,
        existingObjectives: context.supervisorObjectives,
        rewrites: rewriteMap,
      },
    )

    if (importedActivityKeys.length === 0) {
      return NextResponse.json(
        {
          error: 'No items were imported',
          skipped,
        },
        { status: 400 },
      )
    }

    await writeClient.patch(supervisorContractId).set({ objectives }).commit()

    return NextResponse.json({
      ok: true,
      importedActivityKeys,
      skipped,
    })
  } catch (error) {
    if (error instanceof CascadeImportContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error cascading from manager contract', error)
    return NextResponse.json(
      { error: 'Failed to cascade from manager contract' },
      { status: 500 },
    )
  }
}
