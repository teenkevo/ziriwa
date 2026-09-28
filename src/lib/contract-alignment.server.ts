import 'server-only'

import { client } from '@/sanity/lib/client'
import {
  parseContractAlignment,
  type ContractAlignment,
} from '@/lib/contract-alignment'

/** Resolve section alignment for snapshotting onto a new FY contract. */
export async function getSectionContractAlignment(
  sectionId: string,
): Promise<ContractAlignment> {
  const raw = await client.fetch<string | null>(
    /* groq */ `*[_type == "section" && _id == $id][0].contractAlignment`,
    { id: sectionId },
  )
  return parseContractAlignment(raw)
}
