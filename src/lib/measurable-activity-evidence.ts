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
