/** Strip HTML tags and collapse whitespace for plain-text previews and validation. */
export function stripRichTextHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasRichTextContent(value?: string | null): boolean {
  if (!value) return false
  return Boolean(stripRichTextHtml(value))
}

export function getRichTextPlainText(
  value?: string | null,
  fallback = '',
): string {
  if (!value) return fallback
  const plain = stripRichTextHtml(value)
  return plain || fallback
}
