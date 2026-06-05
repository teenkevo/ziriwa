export type SprintView = 'ready' | 'in-review' | 'draft'

const SPRINT_PAGE_TITLES: Record<SprintView, string> = {
  ready: 'Ready Sprints',
  'in-review': 'Sprints In Review',
  draft: 'Draft Sprints',
}

export function getSprintsPageTitle(view: SprintView = 'ready'): string {
  return SPRINT_PAGE_TITLES[view]
}
