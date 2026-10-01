/** Staff ids sent when creating a measurable activity. */
export function parseCreateAssigneeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .filter((id): id is string => typeof id === 'string')
        .map(id => id.trim())
        .filter(Boolean),
    ),
  ]
}

/** Adds structured evidence items onto a new measurable activity document. */
export function applyCreatedActivityEvidence(
  doc: Record<string, unknown>,
  evidence: unknown,
): string | null {
  const items = measurableEvidencePatchValue(evidence)
  if (!items?.length) return 'Expected evidence is required'
  doc.evidence = items
  return null
}

/** Turns evidence drafts into Sanity evidence items. Empty labels are dropped. */
export function measurableEvidencePatchValue(
  evidence: unknown,
): Record<string, unknown>[] | null {
  if (!Array.isArray(evidence)) return null
  return evidence.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const label = typeof row.label === 'string' ? row.label.trim() : ''
    if (!label) return []
    const notes = typeof row.notes === 'string' ? row.notes.trim() : ''
    return [
      {
        _type: 'evidenceItem',
        _key:
          typeof row._key === 'string' && row._key
            ? row._key
            : crypto.randomUUID(),
        label,
        ...(notes ? { notes } : {}),
        ...(row.file && typeof row.file === 'object' ? { file: row.file } : {}),
        ...(row.image && typeof row.image === 'object'
          ? { image: row.image }
          : {}),
      },
    ]
  })
}
