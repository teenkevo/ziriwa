import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type PropertyType = 'land' | 'apartment' | 'house' | 'building' | 'other'

export interface FileAsset {
  _id: string
  url: string
  originalFilename?: string
  extension?: string
  mimeType?: string
}

export interface Property {
  _id: string
  name: string
  propertyType: PropertyType
  dateAcquired: string
  landTitle: { asset?: FileAsset }
  documents?: { asset?: FileAsset }[]
  location?: string
  plotNumber?: string
  status: string
}

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  land: 'Land',
  apartment: 'Apartment',
  house: 'House',
  building: 'Building',
  other: 'Other',
}

export { PROPERTY_TYPE_LABELS }

export const getAllProperties = async () => {
  const query = defineQuery(`
    *[_type == "property"] | order(name asc) {
      _id,
      name,
      propertyType,
      dateAcquired,
      landTitle{ asset->{ _id, url, originalFilename, extension, mimeType } },
      documents[]{ asset->{ _id, url, originalFilename, extension, mimeType } },
      location,
      plotNumber,
      status
    }
  `)

  try {
    const properties = await sanityFetch({ query, revalidate: 0 })
    return (properties || []) as Property[]
  } catch (error) {
    console.error('Error fetching properties', error)
    return []
  }
}
