interface StakeholderLinkOptionLabelProps {
  dateLabel: string
  stakeholderLabel: string
  workstreamPrefix?: string
}

export function StakeholderLinkOptionLabel({
  dateLabel,
  stakeholderLabel,
  workstreamPrefix,
}: StakeholderLinkOptionLabelProps) {
  return (
    <span className='inline-flex items-center gap-2'>
      {workstreamPrefix ? <span>{workstreamPrefix}</span> : null}
      <span className='font-semibold'>{dateLabel}</span>
      <span aria-hidden='true'>-</span>
      <span>{stakeholderLabel}</span>
    </span>
  )
}
