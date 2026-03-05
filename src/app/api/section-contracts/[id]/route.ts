import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

/**
 * PATCH /api/section-contracts/[id] - Add objective, initiative, or activity
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

    if (op === 'addObjective') {
      const { code, title, order } = payload
      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'code is required' }, { status: 400 })
      }
      if (!/^\d+\.\d+$/.test(code.trim())) {
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
      if (!/^\d+\.\d+\.\d+$/.test(code.trim())) {
        return NextResponse.json(
          { error: 'code must match format 1.1.1, 1.1.2' },
          { status: 400 },
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
        !['kpi', 'cross-cutting'].includes(activityType)
      ) {
        return NextResponse.json(
          {
            error:
              'objectiveIndex, initiativeIndex, title, and activityType (kpi|cross-cutting) are required',
          },
          { status: 400 },
        )
      }
      const path = `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities`
      const doc: Record<string, unknown> = {
        _type: 'measurableActivity',
        _key: crypto.randomUUID(),
        activityType,
        title: title.trim(),
        order: typeof order === 'number' ? order : undefined,
        targetDate: targetDate || undefined,
        status: 'not_started',
      }
      if (activityType === 'kpi' && aim?.trim()) {
        doc.aim = aim.trim()
      }
      await writeClient
        .patch(id)
        .setIfMissing({ [path]: [] })
        .append(path, [doc])
        .commit()
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  } catch (error) {
    console.error('Error patching section contract', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 },
    )
  }
}
