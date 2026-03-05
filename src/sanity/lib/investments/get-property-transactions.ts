import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export interface FileAsset {
  _id: string
  url: string
  originalFilename?: string
  extension?: string
  mimeType?: string
}

export interface PropertyInvestmentTransaction {
  _id: string
  investment: {
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

export const getPropertyTransactionsByInvestment = async (
  investmentId: string,
) => {
  const query = defineQuery(`
    *[_type == "propertyInvestmentTransaction" && references($investmentId)] | order(date desc) {
      _id,
      investment->{ _id, name },
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
    const transactions = await sanityFetch({
      query,
      params: { investmentId },
      revalidate: 0,
    })
    return (transactions || []) as PropertyInvestmentTransaction[]
  } catch (error) {
    console.error('Error fetching property transactions', error)
    return []
  }
}

export const getAllPropertyTransactions = async () => {
  const query = defineQuery(`
    *[_type == "propertyInvestmentTransaction"] | order(date desc) {
      _id,
      investment->{ _id, name },
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
    const transactions = await sanityFetch({ query, revalidate: 0 })
    return (transactions || []) as PropertyInvestmentTransaction[]
  } catch (error) {
    console.error('Error fetching property transactions', error)
    return []
  }
}
