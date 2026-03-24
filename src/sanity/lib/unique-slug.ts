import { client } from './client'

/**
 * Generates a slug that is unique within the given document type.
 * If the base slug already exists, appends -2, -3, etc.
 */
export async function generateUniqueSlug(
  baseSlug: string,
  documentType: string,
): Promise<string> {
  const existing = await client.fetch<string[]>(
    `*[_type == $type && slug.current match $pattern].slug.current`,
    { type: documentType, pattern: `${baseSlug}*` },
  )

  if (!existing.includes(baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  while (existing.includes(`${baseSlug}-${suffix}`)) {
    suffix++
  }
  return `${baseSlug}-${suffix}`
}
