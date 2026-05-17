import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ManagerEmptyState() {
  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-4 pt-6 md:p-8'>
      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>No section assigned</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          Your account is not currently attached to a section as a manager,
          supervisor, or section staff member. Once a section is assigned, this
          workspace will open with your dashboard.
        </CardContent>
      </Card>
    </div>
  )
}
