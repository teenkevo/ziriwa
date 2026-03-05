import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params

  if (!meetingId) {
    return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const minutesFile = formData.get('minutes') as unknown as File | null

    if (!minutesFile || !(minutesFile instanceof File) || minutesFile.size === 0) {
      return NextResponse.json(
        { error: 'Minutes file is required' },
        { status: 400 },
      )
    }

    const asset = await writeClient.assets.upload('file', minutesFile as any, {
      filename: minutesFile.name,
    })

    await writeClient
      .patch(meetingId)
      .set({
        minutes: {
          _type: 'file',
          asset: {
            _type: 'reference',
            _ref: asset._id,
          },
        },
      })
      .commit()

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error uploading minutes', error)
    return NextResponse.json(
      { error: 'Failed to upload minutes' },
      { status: 500 },
    )
  }
}
