import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import {
  duplicateAmongStrings,
  initiativeCodeMatchesObjective,
  remapInitiativeCodeForObjectiveRename,
} from '@/lib/contract-code-validation'
import { audit } from '@/lib/audit-log/events'
import {
  assertDepartmentContractManageAllowed,
  getDepartmentIdFromContract,
} from '@/lib/department-contract-access.server'
import { client } from '@/sanity/lib/client'

/**
 * PATCH /api/department-contracts/[id] - Add objective, initiative, or activity
 * Body: { op: 'addObjective' | 'addInitiative' | 'addActivity', payload }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { op, payload } = body

    if (!op || !payload) {
      return NextResponse.json(
        { error: 'op and payload are required' },
        { status: 400 },
      )
    }

    const departmentId = await getDepartmentIdFromContract(id)
    if (!departmentId) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    const contractOpDenied =
      await assertDepartmentContractManageAllowed(departmentId)
    if (contractOpDenied) return contractOpDenied

    const contractLabel = await client.fetch<string | null>(
      `coalesce(*[_type == "departmentContract" && _id == $id][0].financialYearLabel, "Department contract")`,
      { id },
    )

    if (op === 'updateObjective') {
      const { objectiveIndex, code, title } = payload
      if (typeof objectiveIndex !== 'number') {
        return NextResponse.json(
          { error: 'objectiveIndex is required' },
          { status: 400 },
        )
      }

      const setPayload: Record<string, unknown> = {}

      if (code !== undefined) {
        if (typeof code !== 'string') {
          return NextResponse.json(
            { error: 'code must be a string' },
            { status: 400 },
          )
        }
        const trimmedCode = code.trim()
        if (!/^\d+\.\d+$/.test(trimmedCode)) {
          return NextResponse.json(
            { error: 'code must match format 1.1, 1.2, 2.1' },
            { status: 400 },
          )
        }

        const contract = await writeClient.fetch<{
          objectives?: {
            code?: string
            initiatives?: { code?: string }[]
          }[]
        }>(
          `*[_id == $id][0]{ objectives[] { code, initiatives[] { code } } }`,
          { id },
        )
        const objectives = contract?.objectives ?? []
        const currentObjective = objectives[objectiveIndex]
        const currentCode = currentObjective?.code?.trim() ?? ''
        const objectiveCodeInUseElsewhere = objectives.some(
          (o, i) =>
            i !== objectiveIndex && (o.code?.trim() ?? '') === trimmedCode,
        )
        if (trimmedCode !== currentCode && objectiveCodeInUseElsewhere) {
          return NextResponse.json(
            {
              error: `SSMARTA objective with code "${trimmedCode}" already exists`,
            },
            { status: 409 },
          )
        }

        const oldObjectiveCode =
          currentCode || String(objectiveIndex + 1)
        const initiatives = currentObjective?.initiatives ?? []

        if (trimmedCode !== oldObjectiveCode) {
          const remapped = initiatives.map(init =>
            remapInitiativeCodeForObjectiveRename(
              init.code ?? '',
              oldObjectiveCode,
              trimmedCode,
            ),
          )

          const allInitiativeCodesAfter: string[] = []
          for (let oi = 0; oi < objectives.length; oi++) {
            const inits = objectives[oi].initiatives ?? []
            for (let ii = 0; ii < inits.length; ii++) {
              if (oi === objectiveIndex) {
                allInitiativeCodesAfter.push(remapped[ii] ?? '')
              } else {
                allInitiativeCodesAfter.push(inits[ii].code?.trim() ?? '')
              }
            }
          }
          const dupMsg = duplicateAmongStrings(allInitiativeCodesAfter)
          if (dupMsg) {
            return NextResponse.json({ error: dupMsg }, { status: 409 })
          }

          for (let j = 0; j < remapped.length; j++) {
            const prev = initiatives[j]?.code?.trim() ?? ''
            if (remapped[j] !== prev) {
              setPayload[
                `objectives[${objectiveIndex}].initiatives[${j}].code`
              ] = remapped[j]
            }
          }
        }

        setPayload[`objectives[${objectiveIndex}].code`] = trimmedCode
      }

      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return NextResponse.json(
            { error: 'title must be a non-empty string' },
            { status: 400 },
          )
        }
        setPayload[`objectives[${objectiveIndex}].title`] = title.trim()
      }

      if (Object.keys(setPayload).length > 0) {
        await writeClient.patch(id).set(setPayload).commit()
      }
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'updateInitiative') {
      const { objectiveIndex, initiativeIndex, code, title } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number'
      ) {
        return NextResponse.json(
          { error: 'objectiveIndex and initiativeIndex are required' },
          { status: 400 },
        )
      }

      const setPayload: Record<string, unknown> = {}

      if (code !== undefined) {
        if (typeof code !== 'string') {
          return NextResponse.json(
            { error: 'code must be a string' },
            { status: 400 },
          )
        }
        const trimmedCode = code.trim()
        if (!/^\d+\.\d+\.\d+$/.test(trimmedCode)) {
          return NextResponse.json(
            { error: 'code must match format 1.1.1, 1.1.2, 1.1.3' },
            { status: 400 },
          )
        }

        const contract = await writeClient.fetch<{
          objectiveCode?: string
          initiatives?: { code?: string }[]
        }>(
          `*[_id == $id][0]{ "objectiveCode": objectives[$objIdx].code, "initiatives": objectives[$objIdx].initiatives[] { code } }`,
          { id, objIdx: objectiveIndex },
        )
        const objectiveCode =
          contract?.objectiveCode?.trim() ?? String(objectiveIndex + 1)
        if (!initiativeCodeMatchesObjective(trimmedCode, objectiveCode)) {
          return NextResponse.json(
            {
              error: `Initiative code must nest under this objective (e.g. "${objectiveCode}.1"), not another branch.`,
            },
            { status: 400 },
          )
        }

        const initiatives = contract?.initiatives ?? []
        const existingCodes = initiatives.map(i => i.code?.trim()).filter(Boolean)
        const currentCode = existingCodes[initiativeIndex] ?? null
        if (
          trimmedCode !== (currentCode ?? '').trim() &&
          existingCodes.includes(trimmedCode)
        ) {
          return NextResponse.json(
            { error: `Initiative with code "${trimmedCode}" already exists.` },
            { status: 409 },
          )
        }

        setPayload[
          `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].code`
        ] = trimmedCode
      }

      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return NextResponse.json(
            { error: 'title must be a non-empty string' },
            { status: 400 },
          )
        }
        setPayload[
          `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].title`
        ] = title.trim()
      }

      if (Object.keys(setPayload).length > 0) {
        await writeClient.patch(id).set(setPayload).commit()
      }
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'deleteObjective') {
      const { objectiveIndex } = payload
      if (typeof objectiveIndex !== 'number') {
        return NextResponse.json(
          { error: 'objectiveIndex is required' },
          { status: 400 },
        )
      }
      await writeClient.patch(id).unset([`objectives[${objectiveIndex}]`]).commit()
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'deleteInitiative') {
      const { objectiveIndex, initiativeIndex } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number'
      ) {
        return NextResponse.json(
          { error: 'objectiveIndex and initiativeIndex are required' },
          { status: 400 },
        )
      }
      await writeClient
        .patch(id)
        .unset([
          `objectives[${objectiveIndex}].initiatives[${initiativeIndex}]`,
        ])
        .commit()
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'addObjective') {
      const { code, title, order } = payload
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'code is required' }, { status: 400 })
      }
      const trimmedCode = code.trim()
      if (!/^\d+\.\d+$/.test(trimmedCode)) {
        return NextResponse.json(
          { error: 'code must match format 1.1, 1.2, 2.1' },
          { status: 400 },
        )
      }
      if (!title || typeof title !== 'string') {
        return NextResponse.json(
          { error: 'title is required' },
          { status: 400 },
        )
      }
      const contract = await writeClient.fetch<{
        objectives?: { code?: string }[]
      }>(`*[_id == $id][0]{ objectives[] { code } }`, { id })
      const existingCodes = (contract?.objectives ?? [])
        .map(o => o.code?.trim())
        .filter(Boolean)
      if (existingCodes.includes(trimmedCode)) {
        return NextResponse.json(
          {
            error: `SSMARTA objective with code "${trimmedCode}" already exists`,
          },
          { status: 409 },
        )
      }
      await writeClient
        .patch(id)
        .setIfMissing({ objectives: [] })
        .append('objectives', [
          {
            _type: 'ssmartaObjective',
            _key: crypto.randomUUID(),
            code: code.trim(),
            title: title.trim(),
            order: typeof order === 'number' ? order : undefined,
            initiatives: [],
          },
        ])
        .commit()
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'addInitiative') {
      const { objectiveIndex, code, title, order } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        !code ||
        typeof code !== 'string' ||
        !title ||
        typeof title !== 'string'
      ) {
        return NextResponse.json(
          { error: 'objectiveIndex, code, and title are required' },
          { status: 400 },
        )
      }
      const trimmedCode = code.trim()
      if (!/^\d+\.\d+\.\d+$/.test(trimmedCode)) {
        return NextResponse.json(
          { error: 'code must match format 1.1.1, 1.1.2' },
          { status: 400 },
        )
      }
      const contract = await writeClient.fetch<{
        objectiveCode?: string
        initiatives?: { code?: string }[]
      }>(
        `*[_id == $id][0]{ "objectiveCode": objectives[$objIdx].code, "initiatives": objectives[$objIdx].initiatives[] { code } }`,
        { id, objIdx: objectiveIndex },
      )
      const objectiveCode =
        contract?.objectiveCode?.trim() ?? String(objectiveIndex + 1)
      if (!initiativeCodeMatchesObjective(trimmedCode, objectiveCode)) {
        return NextResponse.json(
          {
            error: `Initiative code must start with "${objectiveCode}." (under this SSMARTA objective).`,
          },
          { status: 400 },
        )
      }
      const initiatives = contract?.initiatives ?? []
      const existingCodes = initiatives.map(i => i.code?.trim()).filter(Boolean)
      if (existingCodes.includes(trimmedCode)) {
        return NextResponse.json(
          { error: `Initiative with code "${trimmedCode}" already exists.` },
          { status: 409 },
        )
      }
      await writeClient
        .patch(id)
        .setIfMissing({
          [`objectives[${objectiveIndex}].initiatives`]: [],
        })
        .append(`objectives[${objectiveIndex}].initiatives`, [
          {
            _type: 'contractInitiative',
            _key: crypto.randomUUID(),
            code: code.trim(),
            title: title.trim(),
            order: typeof order === 'number' ? order : undefined,
            measurableActivities: [],
          },
        ])
        .commit()
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'addMeasurableActivity') {
      const {
        objectiveIndex,
        initiativeIndex,
        activityType,
        title,
        aim,
        targetDate,
        order,
      } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number' ||
        !title ||
        typeof title !== 'string' ||
        activityType !== 'measurable'
      ) {
        return NextResponse.json(
          {
            error:
              'objectiveIndex, initiativeIndex, title, and activityType "measurable" are required',
          },
          { status: 400 },
        )
      }
      const path = `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities`
      const doc: Record<string, unknown> = {
        _type: 'measurableActivity',
        _key: crypto.randomUUID(),
        activityType: 'measurable',
        title: title.trim(),
        order: typeof order === 'number' ? order : undefined,
        targetDate: targetDate || undefined,
        status: 'not_started',
        reportingFrequency: 'monthly',
      }
      await writeClient
        .patch(id)
        .setIfMissing({ [path]: [] })
        .append(path, [doc])
        .commit()
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'updateActivity') {
      const {
        objectiveIndex,
        initiativeIndex,
        activityIndex,
        title,
        aim,
        targetDate,
        status,
        reportingFrequency,
      } = payload
      if (
        typeof objectiveIndex !== 'number' ||
        typeof initiativeIndex !== 'number' ||
        typeof activityIndex !== 'number'
      ) {
        return NextResponse.json(
          {
            error:
              'objectiveIndex, initiativeIndex, and activityIndex are required',
          },
          { status: 400 },
        )
      }
      const basePath = `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities[${activityIndex}]`
      const setPayload: Record<string, unknown> = {}
      if (title !== undefined && typeof title === 'string') {
        setPayload[`${basePath}.title`] = title.trim()
      }
      if (aim !== undefined) {
        setPayload[`${basePath}.aim`] =
          typeof aim === 'string' ? aim.trim() : undefined
      }
      if (targetDate !== undefined) {
        setPayload[`${basePath}.targetDate`] = targetDate || undefined
      }
      if (
        status !== undefined &&
        ['not_started', 'in_progress', 'completed'].includes(status)
      ) {
        setPayload[`${basePath}.status`] = status
      }
      if (
        reportingFrequency !== undefined &&
        ['weekly', 'monthly', 'quarterly', 'n/a'].includes(reportingFrequency)
      ) {
        setPayload[`${basePath}.reportingFrequency`] = reportingFrequency
      }
      if (Object.keys(setPayload).length > 0) {
        await writeClient.patch(id).set(setPayload).commit()
      }
      audit.sectionContract.updated(
        id,
        contractLabel ?? 'Section contract',
        op,
        departmentId,
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  } catch (error) {
    console.error('Error patching department contract', error)
    return NextResponse.json(
      { error: 'Failed to update department contract' },
      { status: 500 },
    )
  }
}
