import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const propertyId = formData.get('propertyId') as string | null
    const transactionType = formData.get('transactionType') as string | null
    const amountStr = formData.get('amount') as string | null
    const date = formData.get('date') as string | null
    const counterparty = formData.get('counterparty') as string | null
    const notes = formData.get('notes') as string | null
    const documentFiles = formData.getAll('documents') as File[]

    if (!propertyId || !transactionType || !amountStr || !date) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: propertyId, transactionType, amount, date',
        },
        { status: 400 },
      )
    }

    if (
      !['purchase', 'sale', 'maintenance', 'fees'].includes(transactionType)
    ) {
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

    const requiresDocs = ['purchase', 'sale'].includes(transactionType)
    if (requiresDocs && (!documentFiles || documentFiles.length === 0)) {
      return NextResponse.json(
        {
          error:
            'Supporting documents are required for purchase and sale transactions',
        },
        { status: 400 },
      )
    }

    const ownershipDocuments: { _type: string; asset: { _type: string; _ref: string } }[] = []
    for (const file of documentFiles) {
      if (file && file.size > 0) {
        const asset = await writeClient.assets.upload(
          'file',
          file as Blob,
          { filename: file.name },
        )
        ownershipDocuments.push({
          _type: 'file',
          asset: { _type: 'reference', _ref: asset._id },
        })
      }
    }

    const doc = {
      _type: 'propertyTransaction',
      property: {
        _type: 'reference' as const,
        _ref: propertyId,
      },
      transactionType,
      amount,
      date,
      counterparty: counterparty || undefined,
      notes: notes || undefined,
      status: 'confirmed' as const,
      ...(ownershipDocuments.length > 0 && { ownershipDocuments }),
    }

    const result = await writeClient.create(doc as any)

    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating property transaction', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 },
    )
  }
}
