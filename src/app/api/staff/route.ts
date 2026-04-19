import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { STAFF_ROLE_OPTIONS, URA_EMAIL_SUFFIX } from '@/lib/staff-roles'
import { withOracleConnection } from '@/lib/oracle/client'
import oracledb from 'oracledb'

const VALID_ROLES = new Set(STAFF_ROLE_OPTIONS.map(r => r.value))

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      firstName,
      lastName,
      idNumber,
      email,
      role,
      phone,
      sectionId,
      departmentId: rawDepartmentId,
      divisionId: rawDivisionId,
      reportsToId: rawReportsToId,
    } = body

    let departmentId =
      typeof rawDepartmentId === 'string' ? rawDepartmentId.trim() : undefined
    let divisionId =
      typeof rawDivisionId === 'string' ? rawDivisionId.trim() : undefined
    let reportsToId =
      typeof rawReportsToId === 'string' ? rawReportsToId.trim() : undefined

    if (!firstName || typeof firstName !== 'string') {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 },
      )
    }
    if (!lastName || typeof lastName !== 'string') {
      return NextResponse.json(
        { error: 'Last name is required' },
        { status: 400 },
      )
    }
    if (!idNumber || typeof idNumber !== 'string') {
      return NextResponse.json(
        { error: 'ID number is required' },
        { status: 400 },
      )
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      )
    }

    const emailLower = email.trim().toLowerCase()
    if (!emailLower.endsWith(URA_EMAIL_SUFFIX)) {
      return NextResponse.json(
        { error: 'Email must end with @ura.go.ug' },
        { status: 400 },
      )
    }

    if (!role || !VALID_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'Valid role is required' },
        { status: 400 },
      )
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`

    let sectionRef: string | undefined
    let divisionRef: string | undefined
    let departmentRef: string | undefined

    if (role === 'officer' || role === 'supervisor') {
      if (!sectionId || typeof sectionId !== 'string') {
        return NextResponse.json(
          { error: 'Section is required for this role' },
          { status: 400 },
        )
      }
      if (process.env.CMS_PROVIDER === 'oracle') {
        const chain = await withOracleConnection(async conn => {
          const res = await conn.execute(
            `
              SELECT
                s.id AS "section_id",
                s.division_id AS "division_id",
                d.department_id AS "department_id"
              FROM sections s
              JOIN divisions d ON d.id = s.division_id
              WHERE s.id = :sectionId
              FETCH FIRST 1 ROWS ONLY
            `,
            { sectionId } as any,
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          )
          return (res.rows?.[0] ?? null) as
            | { section_id: string; division_id: string; department_id: string }
            | null
        })
        if (!chain?.division_id || !chain.department_id) {
          return NextResponse.json(
            { error: 'Section must belong to a division with a department' },
            { status: 400 },
          )
        }
        sectionRef = chain.section_id
        divisionRef = chain.division_id
        departmentRef = chain.department_id
      } else {
      const chain = await writeClient.fetch<{
        _id: string
        division: { _id: string; department: { _id: string } | null } | null
      } | null>(
        `*[_id == $sectionId][0]{
          _id,
          division->{ _id, department->{ _id } }
        }`,
        { sectionId },
      )
      if (!chain?.division?._id || !chain.division.department?._id) {
        return NextResponse.json(
          { error: 'Section must belong to a division with a department' },
          { status: 400 },
        )
      }
      sectionRef = chain._id
      divisionRef = chain.division._id
      departmentRef = chain.division.department._id
      }
    } else if (role === 'manager') {
      if (sectionId && typeof sectionId === 'string') {
        if (process.env.CMS_PROVIDER === 'oracle') {
          const chain = await withOracleConnection(async conn => {
            const res = await conn.execute(
              `
                SELECT
                  s.id AS "section_id",
                  s.division_id AS "division_id",
                  d.department_id AS "department_id"
                FROM sections s
                JOIN divisions d ON d.id = s.division_id
                WHERE s.id = :sectionId
                FETCH FIRST 1 ROWS ONLY
              `,
              { sectionId } as any,
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            )
            return (res.rows?.[0] ?? null) as
              | {
                  section_id: string
                  division_id: string
                  department_id: string
                }
              | null
          })
          if (!chain?.division_id || !chain.department_id) {
            return NextResponse.json(
              { error: 'Section must belong to a division with a department' },
              { status: 400 },
            )
          }
          sectionRef = chain.section_id
          divisionRef = chain.division_id
          departmentRef = chain.department_id
        } else {
        const chain = await writeClient.fetch<{
          _id: string
          division: { _id: string; department: { _id: string } | null } | null
        } | null>(
          `*[_id == $sectionId][0]{
            _id,
            division->{ _id, department->{ _id } }
          }`,
          { sectionId },
        )
        if (!chain?.division?._id || !chain.division.department?._id) {
          return NextResponse.json(
            { error: 'Section must belong to a division with a department' },
            { status: 400 },
          )
        }
        sectionRef = chain._id
        divisionRef = chain.division._id
        departmentRef = chain.division.department._id
        }
      } else if (divisionId) {
        if (process.env.CMS_PROVIDER === 'oracle') {
          const div = await withOracleConnection(async conn => {
            const res = await conn.execute(
              `
                SELECT
                  id AS "division_id",
                  department_id AS "department_id"
                FROM divisions
                WHERE id = :divisionId
                FETCH FIRST 1 ROWS ONLY
              `,
              { divisionId } as any,
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            )
            return (res.rows?.[0] ?? null) as
              | { division_id: string; department_id: string }
              | null
          })
          if (!div?.department_id) {
            return NextResponse.json(
              { error: 'Division must belong to a department' },
              { status: 400 },
            )
          }
          divisionRef = div.division_id
          departmentRef = div.department_id
        } else {
        const div = await writeClient.fetch<{
          _id: string
          department: { _id: string } | null
        } | null>(
          `*[_id == $divisionId][0]{ _id, department->{ _id } }`,
          { divisionId },
        )
        if (!div?.department?._id) {
          return NextResponse.json(
            { error: 'Division must belong to a department' },
            { status: 400 },
          )
        }
        divisionRef = div._id
        departmentRef = div.department._id
        }
      } else {
        return NextResponse.json(
          { error: 'Division (or section) is required for manager' },
          { status: 400 },
        )
      }
    } else if (role === 'assistant_commissioner') {
      if (divisionId) {
        if (process.env.CMS_PROVIDER === 'oracle') {
          const div = await withOracleConnection(async conn => {
            const res = await conn.execute(
              `
                SELECT
                  id AS "division_id",
                  department_id AS "department_id"
                FROM divisions
                WHERE id = :divisionId
                FETCH FIRST 1 ROWS ONLY
              `,
              { divisionId } as any,
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            )
            return (res.rows?.[0] ?? null) as
              | { division_id: string; department_id: string }
              | null
          })
          if (!div?.department_id) {
            return NextResponse.json(
              { error: 'Division must belong to a department' },
              { status: 400 },
            )
          }
          divisionRef = div.division_id
          departmentRef = div.department_id
        } else {
        const div = await writeClient.fetch<{
          _id: string
          department: { _id: string } | null
        } | null>(
          `*[_id == $divisionId][0]{ _id, department->{ _id } }`,
          { divisionId },
        )
        if (!div?.department?._id) {
          return NextResponse.json(
            { error: 'Division must belong to a department' },
            { status: 400 },
          )
        }
        divisionRef = div._id
        departmentRef = div.department._id
        }
      } else if (departmentId) {
        departmentRef = departmentId
      } else {
        return NextResponse.json(
          {
            error:
              'Department or division is required for assistant commissioner',
          },
          { status: 400 },
        )
      }

      if (departmentRef && !reportsToId) {
        if (process.env.CMS_PROVIDER === 'oracle') {
          const dept = await withOracleConnection(async conn => {
            const res = await conn.execute(
              `SELECT commissioner_id AS "commissioner_id" FROM departments WHERE id = :id FETCH FIRST 1 ROWS ONLY`,
              { id: departmentRef } as any,
              { outFormat: oracledb.OUT_FORMAT_OBJECT },
            )
            return (res.rows?.[0] ?? null) as
              | { commissioner_id: string | null }
              | null
          })
          if (dept?.commissioner_id) {
            reportsToId = dept.commissioner_id
          }
        } else {
        const dept = await writeClient.fetch<{
          commissioner: { _id: string } | null
        } | null>(
          `*[_id == $id][0]{ commissioner->{ _id } }`,
          { id: departmentRef },
        )
        if (dept?.commissioner?._id) {
          reportsToId = dept.commissioner._id
        }
        }
      }
    } else if (role === 'commissioner') {
      if (departmentId) {
        departmentRef = departmentId
      }
    }

    if (process.env.CMS_PROVIDER === 'oracle') {
      const staffId = crypto.randomUUID()
      await withOracleConnection(async conn => {
        await conn.execute(
          `
            INSERT INTO staff (
              id, first_name, last_name, full_name, id_number, email,
              role, phone, status,
              department_id, division_id, section_id, reports_to_id
            ) VALUES (
              :id, :first_name, :last_name, :full_name, :id_number, :email,
              :role, :phone, :status,
              :department_id, :division_id, :section_id, :reports_to_id
            )
          `,
          {
            id: staffId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            id_number: idNumber.trim(),
            email: emailLower,
            role,
            phone: phone ? String(phone).trim() : null,
            status: 'active',
            department_id: departmentRef ?? null,
            division_id: divisionRef ?? null,
            section_id: sectionRef ?? null,
            reports_to_id: reportsToId ?? null,
          } as any,
          { autoCommit: false },
        )

        if (role === 'commissioner' && departmentRef) {
          await conn.execute(
            `UPDATE departments SET commissioner_id = :sid WHERE id = :id`,
            { sid: staffId, id: departmentRef } as any,
            { autoCommit: false },
          )
        }
        if (role === 'assistant_commissioner' && divisionRef) {
          await conn.execute(
            `UPDATE divisions SET assistant_commissioner_id = :sid WHERE id = :id`,
            { sid: staffId, id: divisionRef } as any,
            { autoCommit: false },
          )
        }

        await conn.commit()
      })

      return NextResponse.json(
        { id: staffId, fullName, role },
        { status: 201 },
      )
    }

    const result = await writeClient.create({
      _type: 'staff',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName,
      idNumber: idNumber.trim(),
      email: emailLower,
      role,
      status: 'active' as const,
      ...(phone && { phone: String(phone).trim() }),
      ...(departmentRef && { department: ref(departmentRef) }),
      ...(divisionRef && { division: ref(divisionRef) }),
      ...(sectionRef && { section: ref(sectionRef) }),
      ...(reportsToId && { reportsTo: ref(reportsToId) }),
    })

    if (role === 'commissioner' && departmentRef) {
      await writeClient
        .patch(departmentRef)
        .set({ commissioner: ref(result._id) })
        .commit()
    }

    if (role === 'assistant_commissioner' && divisionRef) {
      await writeClient
        .patch(divisionRef)
        .set({ assistantCommissioner: ref(result._id) })
        .commit()
    }

    return NextResponse.json(
      { id: result._id, fullName, role },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating staff', error)
    return NextResponse.json(
      { error: 'Failed to create staff' },
      { status: 500 },
    )
  }
}
