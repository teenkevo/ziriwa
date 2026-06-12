import { getAppBaseUrl } from '@/lib/app-url.server'

interface EmailLayoutOptions {
  previewText?: string
  title: string
  bodyHtml: string
  action?: {
    label: string
    href: string
  }
  footerText?: string
  /** Default 560px; use a wider value for data tables. */
  contentMaxWidth?: number
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderEmailLayout(options: EmailLayoutOptions): {
  html: string
  text: string
} {
  const appName = 'Ziriwa'
  const appUrl = getAppBaseUrl()
  const contentMaxWidth = options.contentMaxWidth ?? 560
  const preview = options.previewText ?? options.title
  const footer =
    options.footerText ??
    `You are receiving this email from ${appName}. If this was unexpected, you can ignore it.`

  const actionHtml = options.action
    ? `<p style="margin: 28px 0 0;">
        <a href="${escapeHtml(options.action.href)}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">
          ${escapeHtml(options.action.label)}
        </a>
      </p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
    <span style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(preview)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f4f4f5; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: ${contentMaxWidth}px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="padding: 28px 28px 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280;">
                ${escapeHtml(appName)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 28px 0; font-size: 24px; line-height: 1.3; font-weight: 700;">
                ${escapeHtml(options.title)}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 28px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                ${options.bodyHtml}
                ${actionHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 28px; font-size: 12px; line-height: 1.5; color: #6b7280; border-top: 1px solid #f3f4f6;">
                ${escapeHtml(footer)}
                <br />
                <a href="${escapeHtml(appUrl)}" style="color: #6b7280;">${escapeHtml(appUrl)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const actionText = options.action
    ? `\n\n${options.action.label}: ${options.action.href}`
    : ''

  const text = `${options.title}\n\n${stripHtml(options.bodyHtml)}${actionText}\n\n${footer}\n${appUrl}`

  return { html, text }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function paragraphHtml(text: string): string {
  return `<p style="margin: 0 0 12px;">${escapeHtml(text)}</p>`
}
