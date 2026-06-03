import type { CascadeRewriteContextItem } from './types'

const STYLE_EXAMPLE = {
  managerObjectiveTitle:
    '1.6 Achieve 100% development of a prioritized infrastructure investment roadmap and budget by 30th June 2026',
  managerInitiativeTitle:
    '1.6.1 Identify key investments that support the I.T infrastructure plan.',
  managerKpiTitle:
    'Identification and Prioritization of Data Science Related Investments to Support the IT Infrastructure Plan',
  managerAim:
    'Identify data science related investments that strengthen analytics capability and support delivery of the IT infrastructure plan.',
  managerTargetDate: '30th June 2026',
  supervisorObjectiveTitle:
    "Achieve 100% delivery of the section's prioritized data science investment inputs that support the IT infrastructure plan by 30th June 2026.",
  supervisorInitiativeTitle:
    'Submit prioritized data-science investment proposals for section budget input.',
  supervisorMeasurableTitle:
    'Identification of data science related investments that strengthen analytics capability and support delivery of the IT infrastructure plan.',
}

export const CASCADE_REWRITE_SYSTEM_PROMPT = `You rewrite cascaded performance contract items for a SUPERVISOR contract in a public-sector organisation.

Mapping:
- supervisor objective <= manager initiative
- supervisor initiative <= manager numbered KPI
- supervisor KPI (measurable) <= manager AIM

Style rules:
OBJECTIVE (objectiveTitle)
- Must start with "Achieve"
- Include numeric target if present in manager source (e.g. 100%)
- Scope to the section/team where appropriate ("section's", "team's")
- Include due date if present in manager source
- One sentence, outcome-focused

INITIATIVE (initiativeTitle)
- Must start with a strong imperative verb: Submit, Prepare, Complete, Coordinate, Document, Deliver, Implement, Conduct, Facilitate, Develop, Finalize
- Short operational action, typically one sentence
- Describe what the supervisor will deliver

KPI (measurableTitle)
- Must be a noun phrase, not an imperative
- Prefer "Identification of...", "Development of...", "Completion of...", "Prioritization of..."
- Stay aligned to manager KPI/AIM intent

TASKS (tasks)
- Rewrite manager tasks for supervisor execution where helpful
- Keep the same scope; do not invent new work
- Return as a JSON string array

General:
- Do not copy the same sentence across objective, initiative, and KPI
- Do not invent new targets, dates, or scope
- Preserve manager dates and percentages when relevant
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

export function buildCascadeRewriteUserPrompt(
  contexts: CascadeRewriteContextItem[],
) {
  return JSON.stringify(
    {
      styleExample: STYLE_EXAMPLE,
      items: contexts.map(context => ({
        activityKey: context.activityKey,
        manager: {
          ssmartaObjective: context.managerObjectiveTitle,
          initiative: context.managerInitiativeTitle,
          numberedKpi: context.managerKpiTitle,
          aim: context.managerAim,
          targetDate: context.managerTargetDate ?? null,
          tasks: context.managerTasks,
        },
      })),
    },
    null,
    2,
  )
}
