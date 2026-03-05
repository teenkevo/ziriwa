import { createClient, QueryParams } from '@sanity/client'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Set to false if statically generating pages, using ISR or tag-based revalidation
  stega: {
    studioUrl: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/studio`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/studio`,
  },
})

export async function sanityFetch<const QueryString extends string>({
  query,
  params = {},
  revalidate = 0, // default revalidation time in seconds
  tags = [],
}: {
  query: QueryString
  params?: QueryParams
  revalidate?: number | false
  tags?: string[]
}) {
  return client.fetch(query, params, {
    next: {
      revalidate: tags.length ? false : revalidate, // for simple, time-based revalidation
      tags, // for tag-based revalidation
    },
  })
}
