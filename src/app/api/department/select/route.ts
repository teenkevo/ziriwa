import { NextRequest, NextResponse } from 'next/server'
import { DEPARTMENT_COOKIE_NAME } from '@/lib/division'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 },
      )
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(DEPARTMENT_COOKIE_NAME, id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Error setting department', error)
    return NextResponse.json(
      { error: 'Failed to set department' },
      { status: 500 },
    )
  }
}
