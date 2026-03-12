import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are accepted for deliverables' },
        { status: 400 },
      )
    }

    const asset = await writeClient.assets.upload('file', file as any, {
      filename: file.name,
    })

    return NextResponse.json(
      {
        id: asset._id,
        url: asset.url,
        originalFilename: (asset as { originalFilename?: string }).originalFilename ?? file.name,
        size: (asset as { size?: number }).size,
        mimeType: (asset as { mimeType?: string }).mimeType ?? 'application/pdf',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error uploading file', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 },
    )
  }
}
