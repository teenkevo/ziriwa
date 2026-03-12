import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { assetId } = body

    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json(
        { error: 'assetId is required' },
        { status: 400 },
      )
    }

    await writeClient.delete(assetId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting asset', error)
    const statusCode =
      (error as { statusCode?: number })?.statusCode ?? 500
    return NextResponse.json(
      {
        error:
          statusCode === 404
            ? 'Asset not found'
            : (error as Error).message ?? 'Failed to delete asset',
      },
      { status: statusCode },
    )
  }
}
