import 'server-only'

import {
  paragraphHtml,
  renderEmailLayout,
} from '@/lib/email/templates/layout'
import type { EmailTemplateDefinition } from '@/lib/email/types'

export interface NotificationEmailData {
  title: string
  message: string
  previewText?: string
  action?: {
    label: string
    href: string
  }
  footerText?: string
}

export const notificationEmailTemplate: EmailTemplateDefinition<NotificationEmailData> =
  {
    id: 'notification',
    render(data) {
      const { html, text } = renderEmailLayout({
        previewText: data.previewText,
        title: data.title,
        bodyHtml: paragraphHtml(data.message),
        action: data.action,
        footerText: data.footerText,
      })

      return {
        subject: data.title,
        html,
        text,
        previewText: data.previewText ?? data.title,
      }
    },
  }
