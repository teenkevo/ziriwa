/** Manager KPI AIM is required to cascade (AIM becomes supervisor measurable title). */
export function managerKpiHasCascadeAim(aim: string | undefined | null): boolean {
  return Boolean(aim?.trim())
}

export function normalizeAim(aim: string | undefined | null): string {
  return aim?.trim() ?? ''
}
