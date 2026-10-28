import { readFileSync } from 'node:fs'
import { createClient } from '@sanity/client'

function loadEnv(file) {
  try {
    const text = readFileSync(file, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // Missing env file is fine when the other one has the values.
  }
}

loadEnv('.env')
loadEnv('.env.local')

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_TOKEN
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-02-03'

if (!projectId || !dataset || !token) {
  console.error('Missing Sanity project, dataset, or write token.')
  process.exit(1)
}

const CONTRACT_TYPES = [
  'sectionContract',
  'supervisorContract',
  'officerContract',
  'divisionContract',
  'departmentContract',
  'projectContract',
  'deputyProjectContract',
]

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
  perspective: 'raw',
})

function isSafeKey(key) {
  return typeof key === 'string' && key.length > 0 && !/["\\\]]/.test(key)
}

const documents = await client.fetch(
  /* groq */ `*[
    _type in $types &&
    count(objectives[].initiatives[].measurableActivities[activityType in ["kpi", "measurable"]]) > 0
  ]{
    _id,
    _type,
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

let kpiCount = 0
let measurableCount = 0
let patchedDocuments = 0
let patchedActivities = 0
const skipped = []
const failures = []

for (const doc of documents) {
  const sets = {}
  for (const objective of doc.objectives ?? []) {
    if (!isSafeKey(objective?._key)) {
      skipped.push(doc._id)
      continue
    }
    for (const initiative of objective.initiatives ?? []) {
      if (!isSafeKey(initiative?._key)) {
        skipped.push(doc._id)
        continue
      }
      for (const activity of initiative.measurableActivities ?? []) {
        if (!isSafeKey(activity?._key)) {
          skipped.push(doc._id)
          continue
        }
        if (activity.activityType === 'kpi') kpiCount++
        else if (activity.activityType === 'measurable') measurableCount++
        else continue
        const path = `objectives[_key=="${objective._key}"].initiatives[_key=="${initiative._key}"].measurableActivities[_key=="${activity._key}"].activityType`
        sets[path] = 'core'
      }
    }
  }

  const paths = Object.keys(sets)
  if (paths.length === 0) continue

  try {
    await client.patch(doc._id).set(sets).commit({ autoGenerateArrayKeys: false })
    patchedDocuments++
    patchedActivities += paths.length
  } catch (error) {
    failures.push({
      id: doc._id,
      message: error instanceof Error ? error.message : 'Patch failed',
    })
  }
}

const remaining = await client.fetch(
  /* groq */ `count(*[
    _type in $types &&
    count(objectives[].initiatives[].measurableActivities[activityType in ["kpi", "measurable"]]) > 0
  ])`,
  { types: CONTRACT_TYPES },
)

console.log(
  JSON.stringify(
    {
      documentsMatched: documents.length,
      kpi: kpiCount,
      measurable: measurableCount,
      patchedDocuments,
      patchedActivities,
      skippedDocuments: [...new Set(skipped)].length,
      failures,
      remaining,
    },
    null,
    2,
  ),
)

if (failures.length > 0 || remaining > 0) process.exit(1)
