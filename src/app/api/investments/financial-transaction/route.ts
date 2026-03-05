import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const investmentId = formData.get('investmentId') as string | null
    const transactionType = formData.get('transactionType') as string | null
    const amountStr = formData.get('amount') as string | null
    const date = formData.get('date') as string | null
    const referenceNumber = formData.get('referenceNumber') as string | null
    const notes = formData.get('notes') as string | null

    if (!investmentId || !transactionType || !amountStr || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: investmentId, transactionType, amount, date' },
        { status: 400 },
      )
    }

    if (!['deposit', 'withdrawal'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 },
      )
    }

    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 },
      )
    }

    const proofOfDepositFile = formData.get('proofOfDeposit') as
      | File
      | null
    const redemptionFormFile = formData.get('redemptionForm') as File | null

    if (transactionType === 'deposit') {
      if (!proofOfDepositFile || proofOfDepositFile.size === 0) {
        return NextResponse.json(
          { error: 'Proof of deposit is required for deposits' },
          { status: 400 },
        )
      }
    }

    if (transactionType === 'withdrawal') {
      if (!redemptionFormFile || redemptionFormFile.size === 0) {
        return NextResponse.json(
          { error: 'Redemption form is required for withdrawals' },
          { status: 400 },
        )
      }
    }

    const doc: Record<string, unknown> = {
      _type: 'financialInvestmentTransaction',
      investment: {
        _type: 'reference',
        _ref: investmentId,
      },
      transactionType,
      amount,
      date,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
      status: 'confirmed',
    }

    if (transactionType === 'deposit' && proofOfDepositFile) {
      const asset = await writeClient.assets.upload(
        'file',
        proofOfDepositFile as Blob,
        { filename: proofOfDepositFile.name },
      )
      doc.proofOfDeposit = {
        _type: 'file',
        asset: { _type: 'reference', _ref: asset._id },
      }
    }

    if (transactionType === 'withdrawal' && redemptionFormFile) {
      const asset = await writeClient.assets.upload(
        'file',
        redemptionFormFile as Blob,
        { filename: redemptionFormFile.name },
      )
      doc.redemptionForm = {
        _type: 'file',
        asset: { _type: 'reference', _ref: asset._id },
      }
    }

    const result = await writeClient.create(doc as any)

    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating financial transaction', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 },
    )
  }
}
