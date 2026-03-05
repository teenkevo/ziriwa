import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const name = formData.get('name') as string | null
    const propertyType = formData.get('propertyType') as string | null
    const dateAcquired = formData.get('dateAcquired') as string | null
    const location = formData.get('location') as string | null
    const plotNumber = formData.get('plotNumber') as string | null
    const landTitleFile = formData.get('landTitle') as File | null
    const documentFiles = formData.getAll('documents') as File[]

    if (!name || !propertyType || !dateAcquired) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, propertyType, dateAcquired',
        },
        { status: 400 },
      )
    }

    const validTypes = ['land', 'apartment', 'house', 'building', 'other']
    if (!validTypes.includes(propertyType)) {
      return NextResponse.json(
        { error: 'Invalid property type' },
        { status: 400 },
      )
    }

    if (!landTitleFile || landTitleFile.size === 0) {
      return NextResponse.json(
        { error: 'Land title document is required' },
        { status: 400 },
      )
    }

    const landTitleAsset = await writeClient.assets.upload(
      'file',
      landTitleFile as Blob,
      { filename: landTitleFile.name },
    )

    const documents: { _type: string; asset: { _type: string; _ref: string } }[] = []
    for (const file of documentFiles) {
      if (file && file.size > 0) {
        const asset = await writeClient.assets.upload(
          'file',
          file as Blob,
          { filename: file.name },
        )
        documents.push({
          _type: 'file',
          asset: { _type: 'reference', _ref: asset._id },
        })
      }
    }

    const doc = {
      _type: 'property',
      name,
      propertyType,
      dateAcquired,
      landTitle: {
        _type: 'file' as const,
        asset: { _type: 'reference' as const, _ref: landTitleAsset._id },
      },
      ...(documents.length > 0 && { documents }),
      location: location || undefined,
      plotNumber: plotNumber || undefined,
      status: 'active' as const,
    }

    const result = await writeClient.create(doc as any)

    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating property', error)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 },
    )
  }
}
