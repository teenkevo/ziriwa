export async function patchContractReorder(
  url: string,
  op: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Failed to reorder',
    )
  }
}
