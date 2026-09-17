import { NextRequest, NextResponse } from 'next/server'

import {
  FINANCIAL_YEAR_COOKIE,
  FINANCIAL_YEAR_COOKIE_MAX_AGE,
  getCurrentFinancialYear,
  isFinancialYearLabel,
  listSelectableFinancialYears,
} from '@/lib/financial-year'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { label?: string; clear?: boolean }

    if (body.clear === true) {
      const response = NextResponse.json({
        success: true,
        label: getCurrentFinancialYear().label,
      })
      response.cookies.set(FINANCIAL_YEAR_COOKIE, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      })
      return response
    }

    const label = body.label?.trim()
    if (!label || !isFinancialYearLabel(label)) {
      return NextResponse.json(
        { error: 'Valid financial year label is required (e.g. FY-2025/2026)' },
        { status: 400 },
      )
    }

    const allowed = new Set(listSelectableFinancialYears().map(fy => fy.label))
    if (!allowed.has(label)) {
      return NextResponse.json(
        { error: 'Financial year is outside the selectable range' },
        { status: 400 },
      )
    }

    const response = NextResponse.json({ success: true, label })
    response.cookies.set(FINANCIAL_YEAR_COOKIE, label, {
      path: '/',
      maxAge: FINANCIAL_YEAR_COOKIE_MAX_AGE,
      sameSite: 'lax',
    })
    return response
  } catch (error) {
    console.error('Error setting financial year', error)
    return NextResponse.json(
      { error: 'Failed to set financial year' },
      { status: 500 },
    )
  }
}
