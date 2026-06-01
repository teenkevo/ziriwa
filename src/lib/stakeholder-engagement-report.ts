export function hasSubmittedEngagementReport(report?: string): boolean {
  if (!report?.trim()) return false
  const text = report
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.length > 0
}
