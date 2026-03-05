import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const investmentId = formData.get('investmentId') as string | null
    const statementDate = formData.get('statementDate') as string | null
    const closingBalanceStr = formData.get('closingBalance') as string | null
    const interestEarnedStr = formData.get('interestEarned') as string | null
    const notes = formData.get('notes') as string | null
    const documentFile = formData.get('document') as File | null

    if (!investmentId || !statementDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields: investmentId, statementDate',
        },
        { status: 400 },
      )
    }

    if (!documentFile || documentFile.size === 0) {
      return NextResponse.json(
        { error: 'Statement document is required' },
        { status: 400 },
      )
    }

    const closingBalance = closingBalanceStr
      ? parseFloat(closingBalanceStr)
      : undefined
    const interestEarned = interestEarnedStr
      ? parseFloat(interestEarnedStr)
      : undefined

    const asset = await writeClient.assets.upload(
      'file',
      documentFile as Blob,
      { filename: documentFile.name },
    )

    const doc = {
      _type: 'investmentStatement',
      investment: {
        _type: 'reference' as const,
        _ref: investmentId,
      },
      statementDate,
      document: {
        _type: 'file' as const,
        asset: { _type: 'reference' as const, _ref: asset._id },
      },
      ...(typeof closingBalance === 'number' &&
        !isNaN(closingBalance) && { closingBalance }),
      ...(typeof interestEarned === 'number' &&
        !isNaN(interestEarned) && { interestEarned }),
      notes: notes || undefined,
    }

    const result = await writeClient.create(doc as any)

    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating investment statement', error)
    return NextResponse.json(
      { error: 'Failed to create statement' },
      { status: 500 },
    )
  }
}
