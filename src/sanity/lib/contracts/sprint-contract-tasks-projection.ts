/** Minimal detailed-task fields for sprint ↔ contract linking. */
export const SPRINT_CONTRACT_TASKS_PROJECTION = /* groq */ `
  tasks[] {
    _key,
    "task": coalesce(task, @),
  }
`
