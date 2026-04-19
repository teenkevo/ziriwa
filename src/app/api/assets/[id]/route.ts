import { NextRequest, NextResponse } from 'next/server'
import oracledb from 'oracledb'
import { withOracleConnection } from '@/lib/oracle/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const a = await withOracleConnection(async conn => {
    const res = await conn.execute(
      `
        SELECT
          id AS "id",
          original_filename AS "original_filename",
          mime_type AS "mime_type",
          blob_data AS "blob_data"
        FROM assets
        WHERE id = :id
        FETCH FIRST 1 ROWS ONLY
      `,
      { id } as any,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    )

    return (res.rows?.[0] ?? null) as {
      id: string
      original_filename: string | null
      mime_type: string | null
      blob_data: Buffer | Uint8Array | ArrayBuffer | null
    } | null
  })

  if (!a) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  const mime = a.mime_type || 'application/pdf'
  const originalName = a.original_filename || 'file.pdf'

  if (!a.blob_data) {
    return NextResponse.json(
      { error: 'Asset has no data' },
      { status: 404 },
    )
  }

  const buf = Buffer.isBuffer(a.blob_data)
    ? a.blob_data
    : Buffer.from(
        a.blob_data instanceof ArrayBuffer
          ? new Uint8Array(a.blob_data)
          : (a.blob_data as Uint8Array),
      )

  const body = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `inline; filename="${originalName}"`,
      'Content-Length': String(buf.byteLength),
      'Cache-Control': 'no-store',
    },
  })
}

