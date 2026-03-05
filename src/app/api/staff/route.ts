import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { STAFF_ROLE_OPTIONS, URA_EMAIL_SUFFIX } from '@/lib/staff-roles'

const VALID_ROLES = new Set(STAFF_ROLE_OPTIONS.map(r => r.value))

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
    } = body

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

    const doc = {
      _type: 'staff',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName,
      idNumber: idNumber.trim(),
      email: emailLower,
      role,
      status: 'active',
      ...(phone && { phone: String(phone).trim() }),
    }

    const result = await writeClient.create(doc)

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
