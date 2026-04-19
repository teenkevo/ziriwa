import { NextRequest, NextResponse } from 'next/server'
import { checkStaffEmail } from '@/lib/check-staff-email.server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? ''
  if (!email.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const exists = await checkStaffEmail(email)
  return NextResponse.json({ exists })
}

