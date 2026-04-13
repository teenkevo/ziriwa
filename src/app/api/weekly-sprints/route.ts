import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { validateSprintTaskPayload } from '@/lib/sprint-task-validation'
import { getAppRole } from '@/lib/clerk-app-role.server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAppRole()
    if (role === 'officer') {
      return NextResponse.json(
        { error: 'Officers cannot create weekly sprints' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { sectionId, supervisorId, weekLabel, weekStart, weekEnd, tasks } =
      body

    if (!sectionId || !weekLabel || !weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'sectionId, weekLabel, weekStart, and weekEnd are required' },
        { status: 400 },
      )
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: 'At least one task is required' },
        { status: 400 },
      )
    }

    for (const t of tasks) {
      const err = validateSprintTaskPayload(t)
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 })
      }
    }

    const doc = {
      _type: 'weeklySprint',
      section: { _type: 'reference', _ref: sectionId },
      ...(supervisorId && {
        supervisor: { _type: 'reference', _ref: supervisorId },
      }),
      weekLabel,
      weekStart,
      weekEnd,
      status: 'draft',
      tasks: tasks.map(
        (t: {
          description: string
          activityCategory: string
          initiativeKey: string
          initiativeTitle?: string
          activityKey: string
          activityTitle?: string
        }) => ({
          _type: 'sprintTask',
          _key: crypto.randomUUID(),
          description: t.description.trim(),
          activityCategory: t.activityCategory,
          initiativeKey: t.initiativeKey,
          ...(t.initiativeTitle && { initiativeTitle: t.initiativeTitle }),
          activityKey: t.activityKey,
          ...(t.activityTitle && { activityTitle: t.activityTitle }),
          status: 'pending',
        }),
      ),
    }

    const result = await writeClient.create(doc)
    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating weekly sprint', error)
    return NextResponse.json(
      { error: 'Failed to create weekly sprint' },
      { status: 500 },
    )
  }
}
