import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export interface FileAsset {
  _id: string
  url: string
  originalFilename?: string
  extension?: string
  mimeType?: string
}

export interface PropertyTransaction {
  _id: string
  property: {
    _id: string
    name: string
  }
  transactionType: 'purchase' | 'sale' | 'maintenance' | 'fees'
  amount: number
  date: string
  counterparty?: string
  ownershipDocuments?: { asset?: FileAsset }[]
  notes?: string
  status: string
}

export const getPropertyTransactionsByProperty = async (propertyId: string) => {
  const query = defineQuery(`
    *[_type == "propertyTransaction" && references($propertyId)] | order(date desc) {
      _id,
      property->{ _id, name },
      transactionType,
      amount,
      date,
      counterparty,
      ownershipDocuments[]{
        asset->{ _id, url, originalFilename, extension, mimeType }
      },
      notes,
      status
    }
  `)

  try {
    const result = await sanityFetch({
      query,
      params: { propertyId },
      revalidate: 0,
    })
    return (result || []) as PropertyTransaction[]
  } catch (error) {
    console.error('Error fetching property transactions', error)
    return []
  }
}

export const getAllPropertyTransactions = async () => {
  const query = defineQuery(`
    *[_type == "propertyTransaction"] | order(date desc) {
      _id,
      property->{ _id, name },
      transactionType,
      amount,
      date,
      counterparty,
      ownershipDocuments[]{
        asset->{ _id, url, originalFilename, extension, mimeType }
      },
      notes,
      status
    }
  `)

  try {
    const result = await sanityFetch({ query, revalidate: 0 })
    return (result || []) as PropertyTransaction[]
  } catch (error) {
    console.error('Error fetching property transactions', error)
    return []
  }
}
