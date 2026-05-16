import { NextRequest, NextResponse } from 'next/server'
import { isUserAdmin } from '@/lib/authz/guards.server'
import { getAuditEntries } from '@/lib/audit-log/get-audit-entries.server'

export async function GET(req: NextRequest) {
  try {
    if (!(await isUserAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') ?? '50')
    const offset = Number(searchParams.get('offset') ?? '0')
    const resourceType = searchParams.get('resourceType') ?? undefined
    const change = searchParams.get('change') ?? undefined
    const search = searchParams.get('q') ?? undefined

    const result = await getAuditEntries({
      limit,
      offset,
      resourceType: resourceType || undefined,
      change: change || undefined,
      search,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET audit-log', error)
    return NextResponse.json(
      { error: 'Failed to load audit log' },
      { status: 500 },
    )
  }
}
