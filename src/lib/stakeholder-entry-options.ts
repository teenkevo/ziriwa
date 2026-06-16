import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { WorkSubmissionStakeholderLink } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

const OPTION_SEPARATOR = '::'

function formatOptionDate(isoDate?: string): string {
  if (!isoDate) return '—'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export interface StakeholderEntryOption {
  value: string
  engagementId: string
  stakeholderKey: string
  label: string
  dateLabel: string
  stakeholderLabel: string
  name: string
  designation?: string
}

export function encodeStakeholderEntryOptionValue(input: {
  engagementId: string
  stakeholderKey: string
}): string {
  return [input.engagementId, input.stakeholderKey].join(OPTION_SEPARATOR)
}

export function parseStakeholderEntryOptionValue(
  value: string,
): { engagementId: string; stakeholderKey: string } | null {
  const [engagementId, stakeholderKey] = value.split(OPTION_SEPARATOR)
  if (!engagementId || !stakeholderKey) return null
  return { engagementId, stakeholderKey }
}

export function buildStakeholderEntryOptions(
  engagement: StakeholderEngagement | null,
): StakeholderEntryOption[] {
  if (!engagement) return []

  return (engagement.stakeholders ?? []).map((entry, index) => {
    const designation = entry.designation?.trim()
    const name = entry.name?.trim() || `Stakeholder ${index + 1}`
    const stakeholderLabel = designation ? `${name} (${designation})` : name
    const dateLabel = formatOptionDate(entry.proposedDateOfEngagement)
    const label = `${dateLabel}-${stakeholderLabel}`

    return {
      value: encodeStakeholderEntryOptionValue({
        engagementId: engagement._id,
        stakeholderKey: entry._key,
      }),
      engagementId: engagement._id,
      stakeholderKey: entry._key,
      label,
      dateLabel,
      stakeholderLabel,
      name,
      designation,
    }
  })
}

export function resolveLinkedStakeholderLabel(
  link: WorkSubmissionStakeholderLink | undefined,
  engagement: StakeholderEngagement | null,
): string | null {
  if (!link?.engagementId || !link.stakeholderKey) return null

  const entry = engagement?.stakeholders?.find(s => s._key === link.stakeholderKey)
  if (!entry) return 'Linked stakeholder'

  const designation = entry.designation?.trim()
  const stakeholderLabel = designation
    ? `${entry.name} (${designation})`
    : entry.name
  return `${formatOptionDate(entry.proposedDateOfEngagement)}-${stakeholderLabel}`
}
