'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { ManagerSwitcher } from '@/features/dashboard/components/manager-switcher'
import type { StaffPickerMember } from '@/lib/staff-picker'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface AssignProjectManagerCardProps {
  projectId: string
  projectName: string
  managers: StaffPickerMember[]
  initialManagerId?: string
}

export function AssignProjectManagerCard({
  projectId,
  projectName,
  managers,
  initialManagerId = '',
}: AssignProjectManagerCardProps) {
  const router = useRouter()
  const [managerId, setManagerId] = React.useState(initialManagerId)
  const [isBusy, setIsBusy] = React.useState(false)

  React.useEffect(() => {
    setManagerId(initialManagerId)
  }, [initialManagerId])

  async function handleAssign() {
    if (!managerId) return
    setIsBusy(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'project_manager',
          staffId: managerId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to assign project manager',
        )
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsBusy(false)
    }
  }

  const hasChange = managerId && managerId !== initialManagerId

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project manager</CardTitle>
        <CardDescription>
          Assign who leads {projectName} across all workstreams.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4 sm:flex-row sm:items-end'>
        <div className='min-w-0 flex-1 space-y-2'>
          <ManagerSwitcher
            managers={managers}
            value={managerId}
            onChange={setManagerId}
            placeholder='Select or create project manager'
          />
        </div>
        <Button
          type='button'
          disabled={isBusy || !hasChange}
          onClick={handleAssign}
        >
          {isBusy ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              Saving…
            </>
          ) : (
            'Assign'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
