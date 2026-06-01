import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'

export type ContractOversightBreakdown = {
  activities: number
  atRisk: number
  onTrack: number
}

export type ContractOversightSummary = {
  periodLabel: string
  total: number
  subtitle: string
  breakdown: ContractOversightBreakdown
  completed: number
  percent: number
}

function datePlusDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function computeMeasurableActivityTrackSummary(
  contract: SectionContract | null,
  today: string,
): {
  total: number
  completed: number
  onTrack: number
  atRisk: number
} {
  let total = 0
  let completed = 0
  let onTrack = 0
  let atRisk = 0
  const soonThreshold = datePlusDays(today, 7)

  for (const objective of contract?.objectives ?? []) {
    for (const initiative of objective.initiatives ?? []) {
      for (const activity of initiative.measurableActivities ?? []) {
        total++
        if (activity.status === 'completed') {
          completed++
          onTrack++
          continue
        }

        const targetDate = activity.targetDate
        if (targetDate && targetDate < today) {
          atRisk++
          continue
        }

        if (targetDate && targetDate >= today && targetDate <= soonThreshold) {
          atRisk++
          continue
        }

        onTrack++
      }
    }
  }

  return { total, completed, onTrack, atRisk }
}

export function buildContractOversightSummary(
  contract: SectionContract | null,
  today: string,
): ContractOversightSummary {
  const { total, completed, onTrack, atRisk } =
    computeMeasurableActivityTrackSummary(contract, today)

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  const periodLabel = contract?.financialYearLabel?.trim() || '—'

  const subtitle =
    total === 0
      ? 'Contract is not onboarded'
      : `${completed} completed • ${percent}%`

  return {
    periodLabel,
    total,
    subtitle,
    breakdown: {
      activities: total,
      atRisk,
      onTrack,
    },
    completed,
    percent,
  }
}
