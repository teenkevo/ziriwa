import 'server-only'

import type { SanityClient } from 'next-sanity'

import {
  collectSanityAssetRefs,
  deleteSanityAssetRefs,
} from '../cascade-delete'

/** Removes file assets embedded in a single stakeholder entry (e.g. attendance sheets). */
export async function purgeStakeholderEntryAssets(
  client: SanityClient,
  entry: unknown,
) {
  const assetIds = collectSanityAssetRefs(entry)
  if (assetIds.length === 0) return
  await deleteSanityAssetRefs(client, assetIds)
}
