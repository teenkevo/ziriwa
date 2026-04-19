import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'

/** Flatten initiatives from objectives for dropdowns (e.g. stakeholder engagement link). */
export function flattenInitiatives(
  contract: SectionContract | null,
): { code: string; title: string }[] {
  if (!contract?.objectives) return []
  const out: { code: string; title: string }[] = []
  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      const code = init.code ?? init._key ?? ''
      if (code && init.title) out.push({ code, title: init.title })
    }
  }
  return out
}

