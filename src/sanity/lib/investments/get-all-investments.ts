import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type InvestmentType =
  | 'unit_trust'
  | 'bond'
  | 'money_market'
  | 'other'

export interface Investment {
  _id: string
  name: string
  investmentType: InvestmentType
  provider?: string
  accountName?: string
  product?: string
  memberNumber?: string
  accountNumber?: string
  description?: string
  status: string
}

export function isFinancialInvestment(type: InvestmentType) {
  return ['unit_trust', 'bond', 'money_market'].includes(type)
}

export const getAllInvestments = async () => {
  const query = defineQuery(`
    *[_type == "investment"] | order(name asc) {
      _id,
      name,
      investmentType,
      provider,
      accountName,
      product,
      memberNumber,
      accountNumber,
      description,
      status
    }
  `)

  try {
    const investments = await sanityFetch({ query, revalidate: 0 })
    return (investments || []) as Investment[]
  } catch (error) {
    console.error('Error fetching investments', error)
    return []
  }
}
