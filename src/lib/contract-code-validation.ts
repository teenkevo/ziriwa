import { z } from 'zod'

/** Initiative codes are three dot-separated numeric segments (e.g. 4.1.2). */
export const INITIATIVE_CODE_REGEX = /^\d+\.\d+\.\d+$/

/**
 * Initiative codes must nest under their SSMARTA objective code prefix.
 * Example: objective `4.1` → initiatives `4.1.1`, `4.1.2` — not `4.2.1` or `4.3.1`.
 *
 * @param objectiveCode Stored objective code, or fallback like `String(objectiveIndex + 1)` when empty.
 */
export function initiativeCodeMatchesObjective(
  initiativeCode: string,
  objectiveCode: string,
): boolean {
  const t = initiativeCode.trim()
  if (!INITIATIVE_CODE_REGEX.test(t)) return false
  const oc = objectiveCode.trim()
  if (!oc) return false
  return t.startsWith(`${oc}.`)
}

/**
 * When an objective code is renamed, initiatives whose segments extend the old
 * objective prefix are rewritten under the new prefix (e.g. 4.1.2 → 5.3.2).
 * Initiatives that do not share that prefix are left unchanged.
 *
 * If combining the new objective with the tail would yield more than three
 * segments (legacy data where the stored “objective” prefix was a single
 * segment like `"1"` under `1.1.1`), the last segment of the initiative is kept
 * so the result stays `a.b.c`.
 */
export function remapInitiativeCodeForObjectiveRename(
  initiativeCode: string,
  oldObjectiveCode: string,
  newObjectiveCode: string,
): string {
  const ic = initiativeCode.trim()
  const oldO = oldObjectiveCode.trim()
  const newO = newObjectiveCode.trim()
  if (!ic || !oldO || !newO || oldO === newO) return ic
  if (!INITIATIVE_CODE_REGEX.test(ic)) return ic

  const iSeg = ic.split('.')
  const oldSeg = oldO.split('.')
  const newSeg = newO.split('.')

  if (iSeg.length <= oldSeg.length) return ic
  for (let k = 0; k < oldSeg.length; k++) {
    if (iSeg[k] !== oldSeg[k]) return ic
  }

  const tail = iSeg.slice(oldSeg.length)
  let outSeg = [...newSeg, ...tail]
  if (outSeg.length > 3) {
    outSeg = [...newSeg, iSeg[iSeg.length - 1]!]
  }

  const out = outSeg.join('.')
  return INITIATIVE_CODE_REGEX.test(out) ? out : ic
}

/** Returns an error message if non-empty strings are not unique; otherwise null. */
export function duplicateAmongStrings(values: string[]): string | null {
  const nonEmpty = values.filter(v => v.length > 0)
  const seen = new Set<string>()
  for (const v of nonEmpty) {
    if (seen.has(v)) {
      return `Duplicate code "${v}" after update.`
    }
    seen.add(v)
  }
  return null
}

/** Zod schema for add/edit initiative dialogs (regex + objective prefix). */
export function buildInitiativeFormSchema(objectiveCode: string) {
  const oc = objectiveCode.trim() || String(0)
  return z.object({
    code: z
      .string()
      .min(1, 'Code is required')
      .regex(
        INITIATIVE_CODE_REGEX,
        'Code must match format 1.1.1, 1.1.2, 1.1.3',
      )
      .refine(
        c => initiativeCodeMatchesObjective(c, oc),
        `Code must nest under this objective (e.g. "${oc}.1"), not another branch like 4.2.x when the objective is 4.1.`,
      ),
    title: z.string().min(1, 'Initiative is required'),
  })
}

export type InitiativeFormValues = z.infer<
  ReturnType<typeof buildInitiativeFormSchema>
>
