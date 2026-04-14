import { client } from './client'

/**
 * Generates a slug that is unique within the given document type.
 * If the base slug already exists, appends -2, -3, etc.
 */
export async function generateUniqueSlug(
  baseSlug: string,
  documentType: string,
  /** When updating a document, exclude its current slug from collision checks. */
  excludeDocumentId?: string,
): Promise<string> {
  const query = excludeDocumentId
    ? `*[_type == $type && _id != $excludeId && slug.current match $pattern].slug.current`
    : `*[_type == $type && slug.current match $pattern].slug.current`
  const params: Record<string, string> = {
    type: documentType,
    pattern: `${baseSlug}*`,
  }
  if (excludeDocumentId) params.excludeId = excludeDocumentId

  const existing = await client.fetch<string[]>(query, params)

  if (!existing.includes(baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  while (existing.includes(`${baseSlug}-${suffix}`)) {
    suffix++
  }
  return `${baseSlug}-${suffix}`
}
