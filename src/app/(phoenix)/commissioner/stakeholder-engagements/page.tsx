import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommissionerStakeholderEngagementsContent } from '@/features/manager/commissioner-stakeholder-engagements-content'
import { loadCommissionerStakeholderEngagementsData } from '@/features/manager/load-commissioner-stakeholder-engagements'

export default async function CommissionerStakeholderEngagementsPage() {
  const data = await loadCommissionerStakeholderEngagementsData()
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stakeholder engagements</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          No commissioner department found for this account.
        </CardContent>
      </Card>
    )
  }

  return <CommissionerStakeholderEngagementsContent {...data} />
}
