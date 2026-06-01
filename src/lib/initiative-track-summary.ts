import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'

function datePlusDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function computeInitiativeTrackSummary(
  contract: SectionContract | null,
  today: string,
): {
  onTrack: number
  atRisk: number
  offTrack: number
  total: number
} {
  let onTrack = 0
  let atRisk = 0
  let offTrack = 0
  let total = 0
  const soonThreshold = datePlusDays(today, 7)

  for (const objective of contract?.objectives ?? []) {
    for (const initiative of objective.initiatives ?? []) {
      total++
      const activities = initiative.measurableActivities ?? []
      if (activities.length === 0) {
        onTrack++
        continue
      }

      const hasOverdue = activities.some(
        activity =>
          activity.status !== 'completed' &&
          Boolean(activity.targetDate) &&
          activity.targetDate! < today,
      )
      if (hasOverdue) {
        offTrack++
        continue
      }

      const hasDueSoon = activities.some(
        activity =>
          activity.status !== 'completed' &&
          Boolean(activity.targetDate) &&
          activity.targetDate! >= today &&
          activity.targetDate! <= soonThreshold,
      )
      if (hasDueSoon) atRisk++
      else onTrack++
    }
  }

  return { onTrack, atRisk, offTrack, total }
}
