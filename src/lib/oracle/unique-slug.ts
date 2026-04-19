import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'

type SlugTable = 'departments' | 'divisions' | 'sections'

function normalizeBaseSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

export async function generateUniqueSlugOracle(
  base: string,
  table: SlugTable,
  excludeId?: string,
): Promise<string> {
  const baseSlug = normalizeBaseSlug(base) || 'item'

  for (let n = 0; n < 1000; n++) {
    const slug = n === 0 ? baseSlug : `${baseSlug}-${n + 1}`
    const rows = await oracleQuery<{ c: number }>(
      `
        SELECT COUNT(*) AS "c"
        FROM ${table}
        WHERE slug_current = :slug
          ${excludeId ? 'AND id != :excludeId' : ''}
      `,
      excludeId ? { slug, excludeId } : { slug },
    )
    const c = Number(rows[0]?.c ?? 0)
    if (c === 0) return slug
  }

  // Extremely unlikely; fall back to a random suffix
  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`
}

