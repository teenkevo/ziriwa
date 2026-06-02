import { NextRequest, NextResponse } from 'next/server'

import {
  buildSupervisorImport,
  findActivityKeysBlockedWithoutAim,
} from '@/lib/contract-cascade/build-supervisor-import'
import type { CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  assertSupervisorContractManageAllowed,
  getSectionIdFromSupervisorContract,
} from '@/lib/supervisor-contract-access.server'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

function normalizeSelections(raw: unknown): CascadeImportSelection[] | null {
  if (!Array.isArray(raw)) return null
  const out: CascadeImportSelection[] = []
  for (const item of raw) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as CascadeImportSelection).initiativeKey !== 'string'
    ) {
      return null
    }
    const initiativeKey = (item as CascadeImportSelection).initiativeKey.trim()
    const activityKeysRaw = (item as CascadeImportSelection).activityKeys
    if (!Array.isArray(activityKeysRaw)) return null
    const activityKeys = activityKeysRaw
      .filter((k): k is string => typeof k === 'string' && Boolean(k.trim()))
      .map(k => k.trim())
    if (activityKeys.length === 0) continue
    out.push({ initiativeKey, activityKeys })
  }
  return out.length > 0 ? out : null
}

/**
 * POST /api/supervisor-contracts/[id]/cascade-import
 * Body: { selections: { initiativeKey, activityKeys[] }[] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: supervisorContractId } = await params
    const body = await req.json()
    const selections = normalizeSelections(body.selections)

    if (!selections) {
      return NextResponse.json(
        {
          error:
            'selections is required: array of { initiativeKey, activityKeys }',
        },
        { status: 400 },
      )
    }

    const sectionId =
      await getSectionIdFromSupervisorContract(supervisorContractId)
    if (!sectionId) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    const denied = await assertSupervisorContractManageAllowed(sectionId)
    if (denied) return denied

    const supervisorDoc = await writeClient.fetch<{
      financialYearLabel?: string
      objectives?: SsmartaObjective[]
    }>(
      `*[_type == "supervisorContract" && _id == $id][0]{
        financialYearLabel,
        objectives
      }`,
      { id: supervisorContractId },
    )
    if (!supervisorDoc?.financialYearLabel) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const sectionContract = await getSectionContract(
      sectionId,
      supervisorDoc.financialYearLabel,
    )
    if (!sectionContract) {
      return NextResponse.json(
        { error: 'No manager contract for this section and financial year' },
        { status: 404 },
      )
    }

    const blocked = findActivityKeysBlockedWithoutAim(
      sectionContract.objectives ?? [],
      selections,
    )
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error:
            'One or more selected KPIs have no AIM and cannot be cascaded. Manager AIM becomes your measurable activity title.',
          blockedActivityKeys: blocked,
        },
        { status: 400 },
      )
    }

    const cascadeRevision =
      (await client.fetch<number>(
        `coalesce(*[_type == "sectionContract" && _id == $id][0].cascadeRevision, 0)`,
        { id: sectionContract._id },
      )) ?? 0

    const { objectives, importedActivityKeys, skipped } = buildSupervisorImport(
      {
        managerObjectives: sectionContract.objectives ?? [],
        sectionContractId: sectionContract._id,
        cascadeRevision,
        selections,
        existingObjectives: supervisorDoc.objectives ?? [],
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
    console.error('Error cascading from manager contract', error)
    return NextResponse.json(
      { error: 'Failed to cascade from manager contract' },
      { status: 500 },
    )
  }
}
