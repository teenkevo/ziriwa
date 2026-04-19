import { NextRequest, NextResponse } from 'next/server'
import oracledb from 'oracledb'
import { withOracleConnection } from '@/lib/oracle/client'

export async function GET(
  req: NextRequest,
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

  // Support Range requests for built-in PDF viewers (Chrome/Safari).
  const range = req.headers.get('range')
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/i.exec(range.trim())
    if (!m) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${buf.byteLength}`,
          'Cache-Control': 'no-store',
          'Accept-Ranges': 'bytes',
        },
      })
    }

    const size = buf.byteLength
    const startRaw = m[1]
    const endRaw = m[2]

    let start: number
    let end: number

    if (startRaw === '' && endRaw === '') {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`,
          'Cache-Control': 'no-store',
          'Accept-Ranges': 'bytes',
        },
      })
    }

    if (startRaw === '') {
      // Suffix range: bytes=-N (last N bytes)
      const suffixLen = Number(endRaw)
      if (!Number.isFinite(suffixLen) || suffixLen <= 0) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${size}`,
            'Cache-Control': 'no-store',
            'Accept-Ranges': 'bytes',
          },
        })
      }
      start = Math.max(0, size - suffixLen)
      end = size - 1
    } else {
      start = Number(startRaw)
      end = endRaw === '' ? size - 1 : Number(endRaw)
    }

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start ||
      start >= size
    ) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`,
          'Cache-Control': 'no-store',
          'Accept-Ranges': 'bytes',
        },
      })
    }
    end = Math.min(end, size - 1)

    const chunk = buf.subarray(start, end + 1)
    const chunkBody = chunk.buffer.slice(
      chunk.byteOffset,
      chunk.byteOffset + chunk.byteLength,
    ) as ArrayBuffer

    return new NextResponse(chunkBody, {
      status: 206,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${originalName}"`,
        'Content-Length': String(chunk.byteLength),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      },
    })
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `inline; filename="${originalName}"`,
      'Content-Length': String(buf.byteLength),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    },
  })
}

