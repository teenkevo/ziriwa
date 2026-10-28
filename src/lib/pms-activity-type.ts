export type PmsActivityType = 'core' | 'cross-cutting'

/**
 * The activity form only offers core and cross-cutting.
 * Older KPI and measurable rows are cores.
 */
export function pmsActivityType(
  value: string | null | undefined,
): PmsActivityType | undefined {
  if (value === 'cross-cutting') return 'cross-cutting'
  if (value === 'core' || value === 'kpi' || value === 'measurable') return 'core'
  return undefined
}
