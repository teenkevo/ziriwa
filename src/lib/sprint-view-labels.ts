export type SprintView = 'ready' | 'in-review' | 'draft'

const SPRINT_PAGE_TITLES: Record<SprintView, string> = {
  ready: 'Sprints [Ready]',
  'in-review': 'Sprints [In Review]',
  draft: 'Sprints [Drafts]',
}

export function getSprintsPageTitle(view: SprintView = 'ready'): string {
  return SPRINT_PAGE_TITLES[view]
}
