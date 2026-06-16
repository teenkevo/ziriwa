import type { StakeholderWorkSubmissionLink } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { WeeklySprint, WorkSubmission } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export type { StakeholderWorkSubmissionLink }

export interface WorkSubmissionOption {
  value: string
  sprintId: string
  taskKey: string
  submissionKey: string
  label: string
  dateLabel: string
  stakeholderLabel: string
  workstreamPrefix?: string
  sprintLabel: string
  taskDescription: string
  submissionDescription: string
  status?: string
  workstreamName?: string
}

const OPTION_SEPARATOR = '::'

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

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

function formatStakeholderLabel(entry: StakeholderEntry): string {
  const name = entry.name?.trim() || 'Stakeholder'
  const designation = entry.designation?.trim()
  return designation ? `${name} (${designation})` : name
}

function findStakeholderForSubmission(
  stakeholders: StakeholderEntry[],
  sprintId: string,
  taskKey: string,
  submissionKey: string,
  submission: WorkSubmission,
): StakeholderEntry | undefined {
  const linkedKey = submission.linkedStakeholder?.stakeholderKey
  if (linkedKey) {
    const linked = stakeholders.find(entry => entry._key === linkedKey)
    if (linked) return linked
  }

  return stakeholders.find(
    entry =>
      entry.linkedWorkSubmission?.sprintId === sprintId &&
      entry.linkedWorkSubmission?.taskKey === taskKey &&
      entry.linkedWorkSubmission?.submissionKey === submissionKey,
  )
}

export function encodeWorkSubmissionOptionValue(input: {
  sprintId: string
  taskKey: string
  submissionKey: string
}): string {
  return [input.sprintId, input.taskKey, input.submissionKey].join(
    OPTION_SEPARATOR,
  )
}

export function parseWorkSubmissionOptionValue(
  value: string,
): { sprintId: string; taskKey: string; submissionKey: string } | null {
  const [sprintId, taskKey, submissionKey] = value.split(OPTION_SEPARATOR)
  if (!sprintId || !taskKey || !submissionKey) return null
  return { sprintId, taskKey, submissionKey }
}

export function buildStakeholderWorkSubmissionOptions(
  sprints: WeeklySprint[],
  stakeholders: StakeholderEntry[] = [],
): WorkSubmissionOption[] {
  const options: WorkSubmissionOption[] = []

  for (const sprint of sprints) {
    for (const task of sprint.tasks ?? []) {
      for (const submission of task.workSubmissions ?? []) {
        const taskDescription = truncate(stripHtml(task.description ?? ''), 80)
        const submissionDescription = truncate(
          stripHtml(submission.description ?? ''),
          80,
        )
        const linkedStakeholder = findStakeholderForSubmission(
          stakeholders,
          sprint._id,
          task._key,
          submission._key,
          submission,
        )
        const stakeholderLabel = linkedStakeholder
          ? formatStakeholderLabel(linkedStakeholder)
          : 'Unlinked'
        const dateLabel = formatOptionDate(submission.date)
        const workstreamPrefix = sprint.workstreamName
          ? `${sprint.workstreamName} · `
          : ''

        options.push({
          value: encodeWorkSubmissionOptionValue({
            sprintId: sprint._id,
            taskKey: task._key,
            submissionKey: submission._key,
          }),
          sprintId: sprint._id,
          taskKey: task._key,
          submissionKey: submission._key,
          sprintLabel: sprint.weekLabel,
          taskDescription,
          submissionDescription,
          status: submission.status,
          workstreamName: sprint.workstreamName,
          dateLabel,
          stakeholderLabel,
          workstreamPrefix: workstreamPrefix || undefined,
          label: `${workstreamPrefix}${dateLabel}-${stakeholderLabel}`,
        })
      }
    }
  }

  return options.sort((a, b) => {
    const dateCompare = b.sprintLabel.localeCompare(a.sprintLabel)
    return dateCompare !== 0 ? dateCompare : a.label.localeCompare(b.label)
  })
}

export function resolveLinkedWorkSubmissionLabel(
  link: StakeholderWorkSubmissionLink | undefined,
  sprints: WeeklySprint[],
  stakeholders: StakeholderEntry[] = [],
): string | null {
  if (!link?.sprintId || !link.taskKey || !link.submissionKey) return null

  const sprint = sprints.find(s => s._id === link.sprintId)
  if (!sprint) {
    return link.sprint?.weekLabel
      ? `${link.sprint.weekLabel} · Linked submission`
      : 'Linked submission'
  }

  const task = sprint.tasks?.find(t => t._key === link.taskKey)
  const submission = task?.workSubmissions?.find(
    s => s._key === link.submissionKey,
  )
  const workstreamPrefix = sprint.workstreamName
    ? `${sprint.workstreamName} · `
    : ''

  if (!submission) {
    return `${workstreamPrefix}${sprint.weekLabel} · Linked submission`
  }

  const linkedStakeholder = findStakeholderForSubmission(
    stakeholders,
    sprint._id,
    link.taskKey,
    link.submissionKey,
    submission,
  )
  const dateLabel = formatOptionDate(submission.date)
  const stakeholderLabel = linkedStakeholder
    ? formatStakeholderLabel(linkedStakeholder)
    : 'Unlinked'

  return `${workstreamPrefix}${dateLabel}-${stakeholderLabel}`
}

export function linkedWorkSubmissionToOptionValue(
  link: StakeholderWorkSubmissionLink | undefined,
): string {
  if (!link?.sprintId || !link.taskKey || !link.submissionKey) return ''
  return encodeWorkSubmissionOptionValue({
    sprintId: link.sprintId,
    taskKey: link.taskKey,
    submissionKey: link.submissionKey,
  })
}
