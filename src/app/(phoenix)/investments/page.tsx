import { Metadata } from 'next'
import { getAllInvestments } from '@/sanity/lib/investments/get-all-investments'
import { getAllFinancialTransactions } from '@/sanity/lib/investments/get-financial-transactions'
import { getAllStatements } from '@/sanity/lib/investments/get-investment-statements'
import { getAllProperties } from '@/sanity/lib/properties/get-all-properties'
import { getAllPropertyTransactions } from '@/sanity/lib/properties/get-property-transactions'
import { InvestmentsPage } from '@/features/investments/investments-page'

export const metadata: Metadata = {
  title: 'Investments',
}

export default async function InvestmentsRoute() {
  const [
    investments,
    financialTransactions,
    statements,
    properties,
    propertyTransactions,
  ] = await Promise.all([
    getAllInvestments(),
    getAllFinancialTransactions(),
    getAllStatements(),
    getAllProperties(),
    getAllPropertyTransactions(),
  ])

  return (
    <InvestmentsPage
      investments={investments}
      financialTransactions={financialTransactions}
      statements={statements}
      properties={properties}
      propertyTransactions={propertyTransactions}
    />
  )
}
