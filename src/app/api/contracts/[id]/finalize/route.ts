import { NextRequest, NextResponse } from 'next/server'

import { finalizeContract } from '@/lib/contract-finalize.server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await finalizeContract(id)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, blockers: result.blockers },
      { status: result.status },
    )
  }
  return NextResponse.json({ ok: true, warnings: result.warnings })
}
