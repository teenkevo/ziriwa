export type SprintView = 'ready' | 'in-review' | 'draft'

const SPRINT_PAGE_TITLES: Record<SprintView, string> = {
  ready: 'Ready',
  'in-review': 'In review',
  draft: 'Drafts',
}

export function getSprintsPageTitle(view: SprintView = 'ready'): string {
  return SPRINT_PAGE_TITLES[view]
}
