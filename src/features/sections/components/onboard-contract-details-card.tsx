interface OnboardContractDetailsCardProps {
  rows: { label: string; value: string }[]
}

/** Summary card shown inside onboard-contract dialogs (mainstream + project). */
export function OnboardContractDetailsCard({
  rows,
}: OnboardContractDetailsCardProps) {
  return (
    <div className='space-y-4 py-2 pb-4'>
      <div className='rounded-lg border p-4 space-y-2'>
        {rows.map((row, index) => (
          <div key={row.label} className={index > 0 ? 'mt-2' : undefined}>
            <p className='text-sm font-medium'>{row.label}</p>
            <p className='text-sm text-muted-foreground'>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
