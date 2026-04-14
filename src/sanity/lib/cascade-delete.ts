import 'server-only'

import type { SanityClient } from 'next-sanity'

/** Collect Sanity image/file asset ids embedded in a document tree. */
export function collectSanityAssetRefs(value: unknown): string[] {
  const set = new Set<string>()
  function walk(v: unknown) {
    if (v === null || v === undefined) return
    if (Array.isArray(v)) {
      v.forEach(walk)
      return
    }
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>
      if (
        typeof o._ref === 'string' &&
        (o._ref.startsWith('image-') || o._ref.startsWith('file-'))
      ) {
        set.add(o._ref)
      }
      for (const k of Object.keys(o)) walk(o[k])
    }
  }
  walk(value)
  return [...set]
}

async function deleteDocumentAndEmbeddedAssets(
  client: SanityClient,
  docId: string,
) {
  const doc = await client.fetch<unknown | null>(`*[_id == $id][0]`, {
    id: docId,
  })
  if (!doc) return
  const assetIds = collectSanityAssetRefs(doc)
  await client.delete(docId)
  for (const assetId of assetIds) {
    try {
      await client.delete(assetId)
    } catch {
      // Asset may already be removed or referenced elsewhere
    }
  }
}

async function deleteDocumentsBySectionRef(
  client: SanityClient,
  sectionId: string,
  type: 'sectionContract' | 'weeklySprint' | 'stakeholderEngagement',
) {
  const ids = await client.fetch<string[]>(
    `*[_type == $type && section._ref == $sectionId]._id`,
    { type, sectionId },
  )
  for (const id of ids) {
    await deleteDocumentAndEmbeddedAssets(client, id)
  }
}

/** Unset `section` on all staff pointing at this section (people are kept). */
export async function detachStaffFromSection(
  client: SanityClient,
  sectionId: string,
) {
  const staffIds = await client.fetch<string[]>(
    `*[_type == "staff" && section._ref == $sectionId]._id`,
    { sectionId },
  )
  for (const sid of staffIds) {
    await client.patch(sid).unset(['section']).commit()
  }
}

/**
 * Deletes section contracts, weekly sprints, stakeholder engagements (and embedded file assets),
 * detaches all staff from the section, then deletes the section document.
 */
export async function purgeSectionCascade(
  client: SanityClient,
  sectionId: string,
) {
  await deleteDocumentsBySectionRef(client, sectionId, 'sectionContract')
  await deleteDocumentsBySectionRef(client, sectionId, 'weeklySprint')
  await deleteDocumentsBySectionRef(client, sectionId, 'stakeholderEngagement')
  await detachStaffFromSection(client, sectionId)
  await client.delete(sectionId)
}

/**
 * Purges every section in the division (same as section delete), then detaches all staff
 * from the division and deletes the division document.
 */
export async function purgeDivisionCascade(
  client: SanityClient,
  divisionId: string,
) {
  const sectionIds = await client.fetch<string[]>(
    `*[_type == "section" && division._ref == $divisionId]._id`,
    { divisionId },
  )
  for (const sid of sectionIds) {
    await purgeSectionCascade(client, sid)
  }

  const staffWithDivision = await client.fetch<string[]>(
    `*[_type == "staff" && division._ref == $divisionId]._id`,
    { divisionId },
  )
  for (const staffId of staffWithDivision) {
    await client.patch(staffId).unset(['division']).commit()
  }

  await client.delete(divisionId)
}

/**
 * Deletes every division in the department (full cascade per division), detaches all staff
 * still referencing the department, then deletes the department document.
 */
export async function purgeDepartmentCascade(
  client: SanityClient,
  departmentId: string,
) {
  const divisionIds = await client.fetch<string[]>(
    `*[_type == "division" && department._ref == $departmentId]._id`,
    { departmentId },
  )
  for (const divId of divisionIds) {
    await purgeDivisionCascade(client, divId)
  }

  const staffWithDept = await client.fetch<string[]>(
    `*[_type == "staff" && department._ref == $departmentId]._id`,
    { departmentId },
  )
  for (const staffId of staffWithDept) {
    await client.patch(staffId).unset(['department']).commit()
  }

  await client.delete(departmentId)
}
