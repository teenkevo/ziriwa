import { NextRequest, NextResponse } from 'next/server'
import { DIVISION_COOKIE_NAME } from '@/lib/division'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug } = body

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 },
      )
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(DIVISION_COOKIE_NAME, slug, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Error setting division', error)
    return NextResponse.json(
      { error: 'Failed to set division' },
      { status: 500 },
    )
  }
}
