import type { CascadeRewriteContextItem } from './types'

const OFFICER_STYLE_EXAMPLE = {
  supervisorObjectiveTitle:
    "Achieve 100% delivery of the section's prioritized data science investment inputs that support the IT infrastructure plan by 30th June 2026.",
  supervisorInitiativeTitle:
    'Submit prioritized data-science investment proposals for section budget input.',
  supervisorMeasurableTitle:
    'Identification of data science related investments that strengthen analytics capability and support delivery of the IT infrastructure plan.',
  officerObjectiveTitle:
    'Achieve timely completion of assigned data science investment identification tasks supporting the section IT infrastructure plan by 30th June 2026.',
  officerInitiativeTitle:
    'Complete identification of data science related investments per supervisor direction.',
  officerMeasurableTitle:
    'Identification of data science related investments that strengthen analytics capability and support delivery of the IT infrastructure plan.',
}

export const OFFICER_CASCADE_REWRITE_SYSTEM_PROMPT = `You rewrite cascaded performance contract items for an OFFICER contract in a public-sector organisation.

Mapping:
- officer objective <= supervisor initiative
- officer initiative <= supervisor measurable (KPI)
- officer measurable <= supervisor measurable (with detailed tasks)

Style rules:
OBJECTIVE (objectiveTitle)
- Must start with "Achieve"
- Include numeric target if present in supervisor source
- Scope to the officer's assigned work where appropriate
- Include due date if present in supervisor source
- One sentence, outcome-focused

INITIATIVE (initiativeTitle)
- Must start with a strong imperative verb: Submit, Prepare, Complete, Coordinate, Document, Deliver, Implement, Conduct, Facilitate, Develop, Finalize
- Short operational action, typically one sentence
- Describe what the officer will deliver

MEASURABLE (measurableTitle)
- Must be a noun phrase, not an imperative
- Prefer "Identification of...", "Development of...", "Completion of...", "Prioritization of..."
- Stay aligned to supervisor measurable intent

TASKS (tasks)
- Rewrite supervisor tasks for officer execution where helpful
- Keep the same scope; do not invent new work
- Return as a JSON string array

General:
- Do not copy the same sentence across objective, initiative, and measurable
- Do not invent new targets, dates, or scope
- Preserve supervisor dates and percentages when relevant
- Use British date style when the source uses it

Return JSON only:
{
  "rewrites": [
    {
      "activityKey": "...",
      "objectiveTitle": "...",
      "initiativeTitle": "...",
      "measurableTitle": "...",
      "tasks": ["..."]
    }
  ]
}`

export function buildOfficerCascadeRewriteUserPrompt(
  contexts: CascadeRewriteContextItem[],
) {
  return JSON.stringify(
    {
      styleExample: OFFICER_STYLE_EXAMPLE,
      items: contexts.map(context => ({
        activityKey: context.activityKey,
        supervisor: {
          ssmartaObjective: context.managerObjectiveTitle,
          initiative: context.managerInitiativeTitle,
          measurable: context.managerKpiTitle,
          targetDate: context.managerTargetDate ?? null,
          tasks: context.managerTasks,
        },
      })),
    },
    null,
    2,
  )
}
