import { CommissionerContractContent } from '@/features/manager/commissioner-contract-content'
import { loadCommissionerContractPageData } from '@/features/manager/load-commissioner-contract'
import { redirect } from 'next/navigation'

export default async function CommissionerContractPage() {
  const data = await loadCommissionerContractPageData()
  if (!data) redirect('/departments')

  return <CommissionerContractContent {...data} />
}
