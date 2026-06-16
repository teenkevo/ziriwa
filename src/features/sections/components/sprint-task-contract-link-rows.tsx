export function SprintTaskContractLinkRows({
  initiativeTitle,
  activityTitle,
  contractTaskTitle,
}: {
  initiativeTitle?: string
  activityTitle?: string
  contractTaskTitle?: string
}) {
  if (!initiativeTitle && !activityTitle && !contractTaskTitle) return null

  return (
    <div className='mt-6 space-y-6 rounded-md bg-muted p-4 font-light dark:bg-muted/30'>
      {initiativeTitle ? (
        <div>
          <p className='text-[10px] font-medium text-muted-foreground'>
            Related initiative
          </p>
          <p className='text-xs'>{initiativeTitle}</p>
        </div>
      ) : null}
      {activityTitle ? (
        <div>
          <p className='text-[10px] font-medium text-muted-foreground'>
            Related measurable activity
          </p>
          <p className='text-xs leading-relaxed'>{activityTitle}</p>
        </div>
      ) : null}
      {contractTaskTitle ? (
        <div>
          <p className='text-[10px] font-medium text-muted-foreground'>
            Related detailed task
          </p>
          <p className='text-xs'>{contractTaskTitle}</p>
        </div>
      ) : null}
    </div>
  )
}
