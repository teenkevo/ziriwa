import 'server-only'

export interface EmailTableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'center' | 'right'
  render: (row: T) => string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderAtRiskBadge(): string {
  return `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #fef2f2; color: #b91c1c; font-size: 10px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap;">At risk</span>`
}

export function renderCompactEmailTable<T>(options: {
  columns: EmailTableColumn<T>[]
  rows: T[]
  emptyMessage?: string
}): string {
  if (options.rows.length === 0) {
    return `<p style="margin: 0; font-size: 13px; color: #6b7280;">${escapeHtml(options.emptyMessage ?? 'No rows to display.')}</p>`
  }

  const headerCells = options.columns
    .map(column => {
      const align = column.align ?? 'left'
      return `<th align="${align}" style="padding: 8px 6px; font-size: 10px; line-height: 1.3; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">${escapeHtml(column.header)}</th>`
    })
    .join('')

  const bodyRows = options.rows
    .map((row, index) => {
      const cells = options.columns
        .map(column => {
          const align = column.align ?? 'left'
          const background = index % 2 === 0 ? '#ffffff' : '#fcfcfd'
          return `<td align="${align}" style="padding: 7px 6px; font-size: 11px; line-height: 1.35; color: #111827; vertical-align: top; border-bottom: 1px solid #f3f4f6; background: ${background};">${column.render(row)}</td>`
        })
        .join('')

      return `<tr>${cells}</tr>`
    })
    .join('')

  return `<div style="margin: 16px 0 0; overflow-x: auto;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; min-width: 100%;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`
}

export function cellText(value: string): string {
  return escapeHtml(value)
}
