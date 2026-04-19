import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { oracleExecute, oracleQuery } from '@/lib/oracle/client'

export async function POST(req: NextRequest) {
  try {
    if (process.env.CMS_PROVIDER === 'oracle') {
      const body = await req.json()
      const { assetId } = body

      if (!assetId || typeof assetId !== 'string') {
        return NextResponse.json(
          { error: 'assetId is required' },
          { status: 400 },
        )
      }

      const exists = await oracleQuery<{ id: string }>(
        `SELECT id AS "id" FROM assets WHERE id = :assetId FETCH FIRST 1 ROWS ONLY`,
        { assetId },
      )

      if (!exists.length) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      }

      await oracleExecute(`DELETE FROM assets WHERE id = :assetId`, { assetId })
      return NextResponse.json({ ok: true })
    }

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
