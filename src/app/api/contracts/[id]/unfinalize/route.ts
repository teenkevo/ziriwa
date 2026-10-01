import { NextRequest, NextResponse } from 'next/server'

import { canFinalizeContract } from '@/lib/contract-finalize.server'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const contract = await client.fetch<{
    _type?: string
    status?: string
    sectionId?: string
    divisionId?: string
    departmentId?: string
    projectId?: string
    officerId?: string
  } | null>(
    /* groq */ `*[_id == $contractId][0]{
      _type,
      status,
      "sectionId": section._ref,
      "divisionId": division._ref,
      "departmentId": department._ref,
      "projectId": project._ref,
      "officerId": officer._ref
    }`,
    { contractId: id },
  )
  if (!contract?._type) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }
  if (!(await canFinalizeContract(contract))) {
    return NextResponse.json(
      { error: 'You cannot unfinalize this contract.' },
      { status: 403 },
    )
  }
  if (contract.status !== 'finalized') {
    return NextResponse.json(
      { error: 'This contract is not finalized.' },
      { status: 409 },
    )
  }
  await writeClient.patch(id).set({ status: 'draft' }).commit()
  return NextResponse.json({ ok: true })
}
