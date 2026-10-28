import 'server-only'

import { writeClient } from '@/sanity/lib/write-client'

const CONTRACT_TYPES = [
  'sectionContract',
  'supervisorContract',
  'officerContract',
  'divisionContract',
  'departmentContract',
  'projectContract',
  'deputyProjectContract',
] as const

interface LegacyActivity {
  _key?: string
  activityType?: string
}

interface LegacyInitiative {
  _key?: string
  measurableActivities?: LegacyActivity[] | null
}

interface LegacyObjective {
  _key?: string
  initiatives?: LegacyInitiative[] | null
}

interface LegacyContract {
  _id: string
  objectives?: LegacyObjective[] | null
}

export interface RewriteLegacyActivityTypesResult {
  documentsMatched: number
  kpi: number
  measurable: number
  patchedDocuments: number
  patchedActivities: number
  skippedDocuments: number
  failures: { id: string; message: string }[]
  remaining: number
}

function isSafeKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && !/["\\\]]/.test(key)
}

/** Temporary: store legacy KPI and measurable activity types as core. */
export async function rewriteLegacyActivityTypes(): Promise<RewriteLegacyActivityTypesResult> {
  const reader = writeClient.withConfig({ perspective: 'raw' })
  const documents = await reader.fetch<LegacyContract[]>(
    /* groq */ `*[
      _type in $types &&
      count(objectives[].initiatives[].measurableActivities[activityType in ["kpi", "measurable"]]) > 0
    ]{
      _id,
      objectives[]{
        _key,
        initiatives[]{
          _key,
          measurableActivities[activityType in ["kpi", "measurable"]]{
            _key,
            activityType
          }
        }
      }
    }`,
    { types: CONTRACT_TYPES },
  )

  let kpi = 0
  let measurable = 0
  let patchedDocuments = 0
  let patchedActivities = 0
  const skipped = new Set<string>()
  const failures: { id: string; message: string }[] = []

  for (const doc of documents) {
    const sets: Record<string, 'core'> = {}
    for (const objective of doc.objectives ?? []) {
      if (!isSafeKey(objective?._key)) {
        skipped.add(doc._id)
        continue
      }
      for (const initiative of objective.initiatives ?? []) {
        if (!isSafeKey(initiative?._key)) {
          skipped.add(doc._id)
          continue
        }
        for (const activity of initiative.measurableActivities ?? []) {
          if (!isSafeKey(activity?._key)) {
            skipped.add(doc._id)
            continue
          }
          if (activity.activityType === 'kpi') kpi += 1
          else if (activity.activityType === 'measurable') measurable += 1
          else continue
          sets[
            `objectives[_key=="${objective._key}"].initiatives[_key=="${initiative._key}"].measurableActivities[_key=="${activity._key}"].activityType`
          ] = 'core'
        }
      }
    }

    const pathCount = Object.keys(sets).length
    if (pathCount === 0) continue

    try {
      await writeClient
        .patch(doc._id)
        .set(sets)
        .commit({ autoGenerateArrayKeys: false })
      patchedDocuments += 1
      patchedActivities += pathCount
    } catch (error) {
      failures.push({
        id: doc._id,
        message: error instanceof Error ? error.message : 'Patch failed',
      })
    }
  }

  const remaining = await reader.fetch<number>(
    /* groq */ `count(*[
      _type in $types &&
      count(objectives[].initiatives[].measurableActivities[activityType in ["kpi", "measurable"]]) > 0
    ])`,
    { types: CONTRACT_TYPES },
  )

  return {
    documentsMatched: documents.length,
    kpi,
    measurable,
    patchedDocuments,
    patchedActivities,
    skippedDocuments: skipped.size,
    failures,
    remaining,
  }
}
