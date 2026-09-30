export function isCascadedItem(
  item?: { cascadeKind?: string | null } | null,
): boolean {
  return item?.cascadeKind === 'cascaded'
}
