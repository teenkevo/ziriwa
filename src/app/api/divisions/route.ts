import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getAllDivisions } from '@/sanity/lib/divisions/get-all-divisions'
import { generateUniqueSlug } from '@/sanity/lib/unique-slug'
import { hasRoleAtLeast } from '@/lib/app-role'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { getUserIdOrDev } from '@/lib/dev-auth.server'
import { withOracleConnection } from '@/lib/oracle/client'
import { generateUniqueSlugOracle } from '@/lib/oracle/unique-slug'

function staffRef(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

export async function GET() {
  try {
    const divisions = await getAllDivisions()
    return NextResponse.json(divisions)
  } catch (error) {
    console.error('Error fetching divisions', error)
    return NextResponse.json(
      { error: 'Failed to fetch divisions' },
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
        { error: 'Only commissioners can create divisions' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { fullName, acronym, assistantCommissionerId, departmentId } = body

    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json(
        { error: 'Full division name is required' },
        { status: 400 },
      )
    }

    if (!departmentId || typeof departmentId !== 'string') {
      return NextResponse.json(
        { error: 'Department is required' },
        { status: 400 },
      )
    }

    const slugSource = (acronym || fullName).trim()
    const baseSlug = slugSource
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    if (process.env.CMS_PROVIDER === 'oracle') {
      const slug = await generateUniqueSlugOracle(baseSlug, 'divisions')
      const id = crypto.randomUUID()

      await withOracleConnection(async conn => {
        const deptRes = await conn.execute(
          `SELECT id AS "id" FROM departments WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
          { id: departmentId } as any,
        )
        if (!deptRes.rows?.[0]) {
          return NextResponse.json(
            { error: 'Department is required' },
            { status: 400 },
          )
        }

        await conn.execute(
          `
            INSERT INTO divisions (
              id, full_name, acronym, slug_current, department_id,
              assistant_commissioner_id, is_default
            ) VALUES (
              :id, :full_name, :acronym, :slug_current, :department_id,
              :assistant_commissioner_id, :is_default
            )
          `,
          {
            id,
            full_name: fullName.trim(),
            acronym:
              typeof acronym === 'string' && acronym.trim() ? acronym.trim() : null,
            slug_current: slug,
            department_id: departmentId,
            assistant_commissioner_id:
              typeof assistantCommissionerId === 'string' &&
              assistantCommissionerId.trim()
                ? assistantCommissionerId.trim()
                : null,
            is_default: 0,
          } as any,
          { autoCommit: false },
        )

        if (
          assistantCommissionerId &&
          typeof assistantCommissionerId === 'string'
        ) {
          await conn.execute(
            `UPDATE staff SET division_id = :divId, department_id = :deptId WHERE id = :id`,
            { divId: id, deptId: departmentId, id: assistantCommissionerId } as any,
            { autoCommit: false },
          )
        }

        await conn.commit()
      })

      return NextResponse.json({ id, slug }, { status: 201 })
    }

    const slug = await generateUniqueSlug(baseSlug, 'division')

    const doc = {
      _type: 'division',
      fullName: fullName.trim(),
      ...(acronym && { acronym: acronym.trim() }),
      slug: { _type: 'slug', current: slug },
      isDefault: false,
      department: { _type: 'reference', _ref: departmentId },
      ...(assistantCommissionerId && {
        assistantCommissioner: {
          _type: 'reference',
          _ref: assistantCommissionerId,
        },
      }),
    }

    const result = await writeClient.create(doc)

    if (assistantCommissionerId && typeof assistantCommissionerId === 'string') {
      await writeClient
        .patch(assistantCommissionerId)
        .set({
          division: staffRef(result._id),
          department: staffRef(departmentId),
        })
        .commit()
    }

    return NextResponse.json(
      { id: result._id, slug },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating division', error)
    return NextResponse.json(
      { error: 'Failed to create division' },
      { status: 500 },
    )
  }
}
