import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export interface FileAsset {
  _id: string
  url: string
  originalFilename?: string
  extension?: string
  mimeType?: string
}

export interface InvestmentStatement {
  _id: string
  investment: {
    _id: string
    name: string
  }
  statementDate: string
  document: { asset?: FileAsset }
  closingBalance?: number
  interestEarned?: number
  notes?: string
}

export const getStatementsByInvestment = async (investmentId: string) => {
  const query = defineQuery(`
    *[_type == "investmentStatement" && references($investmentId)] | order(statementDate desc) {
      _id,
      investment->{ _id, name },
      statementDate,
      document{ asset->{ _id, url, originalFilename, extension, mimeType } },
      closingBalance,
      interestEarned,
      notes
    }
  `)

  try {
    const result = await sanityFetch({
      query,
      params: { investmentId },
      revalidate: 0,
    })
    return (result || []) as InvestmentStatement[]
  } catch (error) {
    console.error('Error fetching investment statements', error)
    return []
  }
}

export const getAllStatements = async () => {
  const query = defineQuery(`
    *[_type == "investmentStatement"] | order(statementDate desc) {
      _id,
      investment->{ _id, name },
      statementDate,
      document{ asset->{ _id, url, originalFilename, extension, mimeType } },
      closingBalance,
      interestEarned,
      notes
    }
  `)

  try {
    const result = await sanityFetch({ query, revalidate: 0 })
    return (result || []) as InvestmentStatement[]
  } catch (error) {
    console.error('Error fetching investment statements', error)
    return []
  }
}
