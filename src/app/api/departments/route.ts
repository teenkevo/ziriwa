import { NextRequest, NextResponse } from 'next/server'
import { getAllDepartments } from '@/oracle/lib/departments/get-all-departments'
import { hasRoleAtLeast } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getUserIdOrDev } from '@/lib/dev-auth.server'
import { withOracleConnection } from '@/lib/oracle/client'
import { generateUniqueSlugOracle } from '@/lib/oracle/unique-slug'

export async function GET() {
  try {
    const departments = await getAllDepartments()
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Error fetching departments', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdOrDev()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAppRole()
    if (!hasRoleAtLeast(role, 'commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can create departments' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { fullName, acronym, commissionerId } = body

    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json(
        { error: 'Full department name is required' },
        { status: 400 },
      )
    }

    const slugSource = (acronym || fullName).trim()
    const baseSlug = slugSource
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const slug = await generateUniqueSlugOracle(baseSlug, 'departments')
    const id = crypto.randomUUID()

    await withOracleConnection(async conn => {
      await conn.execute(
        `
          INSERT INTO departments (
            id, full_name, acronym, slug_current, is_default, commissioner_id
          ) VALUES (
            :id, :full_name, :acronym, :slug_current, :is_default, :commissioner_id
          )
        `,
        {
          id,
          full_name: fullName.trim(),
          acronym:
            typeof acronym === 'string' && acronym.trim() ? acronym.trim() : null,
          slug_current: slug,
          is_default: 0,
          commissioner_id:
            typeof commissionerId === 'string' && commissionerId.trim()
              ? commissionerId.trim()
              : null,
        } as any,
        { autoCommit: false },
      )

      if (commissionerId && typeof commissionerId === 'string') {
        await conn.execute(
          `UPDATE staff SET department_id = :deptId WHERE id = :id`,
          { deptId: id, id: commissionerId } as any,
          { autoCommit: false },
        )
      }

      await conn.commit()
    })

    return NextResponse.json({ id, slug }, { status: 201 })
  } catch (error) {
    console.error('Error creating department', error)
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 },
    )
  }
}
