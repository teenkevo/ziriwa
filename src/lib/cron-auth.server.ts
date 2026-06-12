import 'server-only'

import { timingSafeEqual } from 'node:crypto'

function readBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return token || null
}

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false

  const bearer = readBearerToken(request.headers.get('authorization'))
  if (bearer && secretsMatch(bearer, secret)) return true

  const headerSecret = request.headers.get('x-cron-secret')?.trim()
  if (headerSecret && secretsMatch(headerSecret, secret)) return true

  return false
}
