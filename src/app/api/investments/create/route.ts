import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      name,
      investmentType,
      provider,
      accountName,
      product,
      memberNumber,
      accountNumber,
    } = body

    if (!investmentType) {
      return NextResponse.json(
        { error: 'Missing required field: investmentType' },
        { status: 400 },
      )
    }

    const validTypes = ['unit_trust', 'bond', 'money_market', 'other']
    if (!validTypes.includes(investmentType)) {
      return NextResponse.json(
        { error: 'Invalid investment type' },
        { status: 400 },
      )
    }

    if (investmentType !== 'unit_trust' && (!name || String(name).trim() === '')) {
      return NextResponse.json(
        { error: 'Name is required for this investment type' },
        { status: 400 },
      )
    }

    if (investmentType === 'unit_trust') {
      const required = ['provider', 'accountName', 'product', 'memberNumber', 'accountNumber']
      const missing = required.filter(
        (field) => !body[field] || String(body[field]).trim() === '',
      )
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `Unit trust investments require: ${missing.join(', ')}`,
          },
          { status: 400 },
        )
      }
    }

    const doc: Record<string, unknown> = {
      _type: 'investment',
      name: investmentType === 'unit_trust' ? accountName : name,
      investmentType,
      provider: provider || undefined,
      status: 'active',
    }

    if (investmentType === 'unit_trust') {
      doc.provider = provider
      doc.accountName = accountName
      doc.product = product
      doc.memberNumber = memberNumber
      doc.accountNumber = accountNumber
    }

    const result = await writeClient.create(doc as any)

    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating investment', error)
    return NextResponse.json(
      { error: 'Failed to create investment' },
      { status: 500 },
    )
  }
}
