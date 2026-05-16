import 'server-only'

import { appendAuditLog } from '@/lib/audit-log/append-audit-log.server'
import type { RecordAuditInput } from '@/lib/audit-log/types'

/** Fire-and-forget audit record; never throws to callers. */
export function recordAudit(input: RecordAuditInput): void {
  void appendAuditLog(input).catch(err => {
    console.error('recordAudit failed', err)
  })
}
