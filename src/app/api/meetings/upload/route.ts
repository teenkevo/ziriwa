import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const title = formData.get('title') as string | null
    const meetingType = formData.get('meetingType') as string | null
    const meetingDate = formData.get('meetingDate') as string | null
    const agendaFile = formData.get('agenda') as unknown as File | null
    const financialsFile = formData.get('financials') as unknown as File | null

    if (!title || !meetingType || !meetingDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    if (!agendaFile || !financialsFile) {
      return NextResponse.json(
        { error: 'Agenda and financials files are required' },
        { status: 400 },
      )
    }

    const agendaAsset = await writeClient.assets.upload('file', agendaFile as any, {
      filename: agendaFile.name,
    })

    const financialsAsset = await writeClient.assets.upload('file', financialsFile as any, {
      filename: financialsFile.name,
    })

    const doc = await writeClient.create({
      _type: 'meeting',
      title,
      meetingType,
      meetingDate,
      agenda: {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: agendaAsset._id,
        },
      },
      financials: {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: financialsAsset._id,
        },
      },
    })

    return NextResponse.json({ id: doc._id }, { status: 201 })
  } catch (error) {
    console.error('Error uploading meeting', error)
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 },
    )
  }
}
