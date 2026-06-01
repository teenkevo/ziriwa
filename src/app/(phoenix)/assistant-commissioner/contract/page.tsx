import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssistantCommissionerContractContent } from '@/features/manager/assistant-commissioner-contract-content'
import { loadAssistantCommissionerContractPageData } from '@/features/manager/load-assistant-commissioner-contract'

export default async function AssistantCommissionerContractPage() {
  const data = await loadAssistantCommissionerContractPageData()

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          No division has been assigned to this assistant commissioner account.
        </CardContent>
      </Card>
    )
  }

  return <AssistantCommissionerContractContent {...data} />
}
