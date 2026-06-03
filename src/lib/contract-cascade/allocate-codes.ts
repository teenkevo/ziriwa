const OBJECTIVE_CODE = /^(\d+)\.(\d+)$/
const INITIATIVE_CODE = /^(\d+)\.(\d+)\.(\d+)$/

/** Next SSMARTA objective code (e.g. 1.1, 2.1) from existing codes. */
export function nextObjectiveCode(existingCodes: string[]): string {
  let maxMajor = 0
  for (const raw of existingCodes) {
    const c = raw.trim()
    const m = OBJECTIVE_CODE.exec(c)
    if (m) maxMajor = Math.max(maxMajor, parseInt(m[1]!, 10))
  }
  const major = maxMajor + 1
  return `${major}.1`
}

/** Next initiative code under an objective prefix (e.g. objective 4.1 → 4.1.1, 4.1.2). */
export function nextInitiativeCode(
  objectiveCode: string,
  existingInitiativeCodes: string[],
): string {
  const prefix = `${objectiveCode.trim()}.`
  let maxSuffix = 0
  for (const raw of existingInitiativeCodes) {
    const c = raw.trim()
    if (!c.startsWith(prefix)) continue
    const m = INITIATIVE_CODE.exec(c)
    if (m && `${m[1]}.${m[2]}` === objectiveCode.trim()) {
      maxSuffix = Math.max(maxSuffix, parseInt(m[3]!, 10))
    }
  }
  return `${objectiveCode.trim()}.${maxSuffix + 1}`
}
