export type MeasurableActivityType = 'core' | 'cross-cutting'

/** KPI and measurable are stored as core. Cross-cutting stays cross-cutting. */
export function measurableActivityType(
  value: string | null | undefined,
): MeasurableActivityType | undefined {
  if (value === 'cross-cutting') return 'cross-cutting'
  if (value === 'core' || value === 'kpi' || value === 'measurable') return 'core'
  return undefined
}

/** Value to persist. Legacy KPI and measurable become core. */
export function storedActivityType(
  value: unknown,
): MeasurableActivityType | null {
  if (typeof value !== 'string') return null
  return measurableActivityType(value) ?? null
}

/** Core, including rows still stored as KPI or measurable. */
export function isCoreActivityType(
  value: string | null | undefined,
): boolean {
  return measurableActivityType(value) === 'core'
}
