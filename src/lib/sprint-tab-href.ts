export type SprintSidebarTab = 'ready' | 'to-review' | 'drafts'

export function buildSprintTabHref(
  basePath: string,
  tab: SprintSidebarTab,
  searchParams?: URLSearchParams | null,
): string {
  const params = new URLSearchParams()
  const workContext = searchParams?.get('workContext')
  if (workContext === 'acting') {
    params.set('workContext', 'acting')
  }
  params.set('tab', tab)
  return `${basePath}/sprints?${params.toString()}`
}
