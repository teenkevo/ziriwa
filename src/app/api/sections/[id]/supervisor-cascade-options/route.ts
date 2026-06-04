import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import { buildOfficerCascadeOptions } from '@/lib/contract-cascade/build-officer-cascade-options'
import { assertOfficerContractManageAllowed } from '@/lib/officer-contract-access.server'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { client } from '@/sanity/lib/client'
import { SPRINT_CONTRACT_TASKS_PROJECTION } from '@/sanity/lib/contracts/sprint-contract-tasks-projection'

/**
 * GET /api/sections/[id]/supervisor-cascade-options
 * Optional ?officerContractId= or ?supervisorContractId= for import flags.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sectionId } = await params
    const denied = await assertOfficerContractManageAllowed(sectionId)
    if (denied) return denied

    const currentFY = getCurrentFinancialYear()
    const officerContractId = req.nextUrl.searchParams.get('officerContractId')
    const supervisorContractIdParam = req.nextUrl.searchParams.get(
      'supervisorContractId',
    )

    let financialYearLabel = currentFY.label
    let officerObjectives: SsmartaObjective[] | undefined

    if (officerContractId) {
      const officer = await client.fetch<{
        financialYearLabel?: string
        objectives?: SsmartaObjective[]
      } | null>(
        `*[_type == "officerContract" && _id == $id && section._ref == $sectionId][0]{
          financialYearLabel,
          objectives[] {
            _key,
            initiatives[] {
              _key,
              measurableActivities[] {
                _key,
                tasks[] {
                  _key,
                  cascadeSource { supervisorContractId, activityKey, taskKey, nodeRole }
                }
              }
            }
          }
        }`,
        { id: officerContractId, sectionId },
      )
      if (!officer) {
        return NextResponse.json(
          { error: 'Officer contract not found' },
          { status: 404 },
        )
      }
      financialYearLabel = officer.financialYearLabel ?? currentFY.label
      officerObjectives = officer.objectives
    }

    const supervisorContractId =
      supervisorContractIdParam?.trim() ||
      (await client.fetch<string | null>(
        `*[_type == "supervisorContract" && section._ref == $sectionId && financialYearLabel == $fy][0]._id`,
        { sectionId, fy: financialYearLabel },
      ))

    if (!supervisorContractId) {
      return NextResponse.json(
        { error: 'No supervisor contract for this section and financial year' },
        { status: 404 },
      )
    }

    const supervisorDoc = await client.fetch<{
      objectives?: SsmartaObjective[]
    } | null>(
      `*[_type == "supervisorContract" && _id == $id && section._ref == $sectionId][0]{
        objectives[] {
          _key,
          code,
          title,
          initiatives[] {
            _key,
            code,
            title,
            measurableActivities[] {
              _key,
              title,
              ${SPRINT_CONTRACT_TASKS_PROJECTION}
            }
          }
        }
      }`,
      { id: supervisorContractId, sectionId },
    )

    if (!supervisorDoc) {
      return NextResponse.json(
        { error: 'Supervisor contract not found' },
        { status: 404 },
      )
    }

    const revision =
      (await client.fetch<number>(
        `coalesce(*[_type == "supervisorContract" && _id == $id][0].cascadeRevision, 0)`,
        { id: supervisorContractId },
      )) ?? 0

    const options = buildOfficerCascadeOptions(
      supervisorContractId,
      financialYearLabel,
      revision,
      supervisorDoc.objectives,
      officerObjectives,
    )

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error fetching supervisor cascade options', error)
    return NextResponse.json(
      { error: 'Failed to fetch cascade options' },
      { status: 500 },
    )
  }
}
