const STAFF_NAME_PROJECTION = /* groq */ `_id, "fullName": coalesce(fullName, firstName + " " + lastName), staffId`

const REVIEW_THREAD_PROJECTION = /* groq */ `[] {
  _key,
  "author": author->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
  role,
  action,
  message,
  createdAt,
  file { asset->{ _id, url, originalFilename, size, mimeType } },
}`

const FILE_ASSET_PROJECTION = /* groq */ `file { asset->{ _id, url, originalFilename, size, mimeType } }`

/** Per-officer (or legacy parent) work fields on a detailed task. */
export const DETAILED_TASK_WORK_PROJECTION = /* groq */ `
  "assignee": select(defined(assignee) => assignee->{ ${STAFF_NAME_PROJECTION} }, null),
  "inputs": select(defined(inputs) => inputs { ${FILE_ASSET_PROJECTION}, submittedAt }, null),
  "inputsReviewThread": select(defined(inputsReviewThread) => inputsReviewThread[] {
    _key,
    "author": author->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
    role,
    action,
    message,
    createdAt,
    ${FILE_ASSET_PROJECTION},
  }, []),
  "deliverableReviewThread": select(defined(deliverableReviewThread) => deliverableReviewThread${REVIEW_THREAD_PROJECTION}, []),
  "status": coalesce(status, "to_do"),
  "periodDeliverables": select(defined(periodDeliverables) => periodDeliverables[] {
    _key,
    periodKey,
    "status": coalesce(status, "pending"),
    submittedAt,
    "deliverable": select(defined(deliverable) => deliverable[] {
      _key,
      ${FILE_ASSET_PROJECTION},
      tag,
      locked,
    }, []),
    "deliverableReviewThread": select(defined(deliverableReviewThread) => deliverableReviewThread${REVIEW_THREAD_PROJECTION}, []),
  }, []),
  "deliverable": select(defined(deliverable) => deliverable[] {
    _key,
    ${FILE_ASSET_PROJECTION},
    tag,
    locked,
  }, []),
`

export const DETAILED_TASK_PROJECTION = /* groq */ `
  _key,
  cascadeKind,
  "task": coalesce(task, @),
  "priority": coalesce(priority, "medium"),
  ${DETAILED_TASK_WORK_PROJECTION}
  "officerWork": select(count(officerWork) > 0 => officerWork[] {
    _key,
    ${DETAILED_TASK_WORK_PROJECTION}
  }, []),
  targetDate,
  "reportingFrequency": coalesce(reportingFrequency, "n/a"),
  expectedDeliverable,
  reportingPeriodStart,
`

/** GROQ fragment for measurable activities including detailed tasks (embedded contracts). */
export const MEASURABLE_ACTIVITIES_WITH_TASKS_PROJECTION = /* groq */ `
  measurableActivities[] {
    _key,
    activityType,
    cascadeSource { nodeRole },
    title,
    aim,
    order,
    targetDate,
    status,
    "reportingFrequency": coalesce(reportingFrequency, "n/a"),
    evidence,
    tasks[] | {
      ${DETAILED_TASK_PROJECTION}
    },
  }
`
