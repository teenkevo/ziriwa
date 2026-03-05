import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export interface FileAsset {
  _id: string
  url: string
  originalFilename?: string
  extension?: string
  mimeType?: string
}

export interface FinancialInvestmentTransaction {
  _id: string
  investment: {
    _id: string
    name: string
  }
  transactionType: 'deposit' | 'withdrawal'
  amount: number
  date: string
  referenceNumber?: string
  proofOfDeposit?: { asset?: FileAsset }
  redemptionForm?: { asset?: FileAsset }
  notes?: string
  status: string
}

export const getFinancialTransactionsByInvestment = async (
  investmentId: string,
) => {
  const query = defineQuery(`
    *[_type == "financialInvestmentTransaction" && references($investmentId)] | order(date desc) {
      _id,
      investment->{ _id, name },
      transactionType,
      amount,
      date,
      referenceNumber,
      proofOfDeposit{ asset->{ _id, url, originalFilename, extension, mimeType } },
      redemptionForm{ asset->{ _id, url, originalFilename, extension, mimeType } },
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
    return (transactions || []) as FinancialInvestmentTransaction[]
  } catch (error) {
    console.error('Error fetching financial transactions', error)
    return []
  }
}

export const getAllFinancialTransactions = async () => {
  const query = defineQuery(`
    *[_type == "financialInvestmentTransaction"] | order(date desc) {
      _id,
      investment->{ _id, name },
      transactionType,
      amount,
      date,
      referenceNumber,
      proofOfDeposit{ asset->{ _id, url, originalFilename, extension, mimeType } },
      redemptionForm{ asset->{ _id, url, originalFilename, extension, mimeType } },
      notes,
      status
    }
  `)

  try {
    const transactions = await sanityFetch({ query, revalidate: 0 })
    return (transactions || []) as FinancialInvestmentTransaction[]
  } catch (error) {
    console.error('Error fetching financial transactions', error)
    return []
  }
}
