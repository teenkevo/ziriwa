import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  IMPERSONATION_COOKIE_MAX_AGE_SEC,
  IMPERSONATION_COOKIE_NAME,
} from '@/lib/impersonation/constants'
import { impersonationCookieClearOptions } from '@/lib/impersonation/cookie-options'

interface ImpersonationPayload {
  email: string
  exp: number
  clerkUserId: string
}

function getImpersonationSecret(): string {
  const secret =
    process.env.IMPERSONATION_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) {
    throw new Error(
      'IMPERSONATION_SECRET or CLERK_SECRET_KEY is required for impersonation',
    )
  }
  return secret
}

function signPayload(encodedPayload: string): string {
  return createHmac('sha256', getImpersonationSecret())
    .update(encodedPayload)
    .digest('base64url')
}

function encodePayload(payload: ImpersonationPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${signPayload(encoded)}`
}

function decodePayload(raw: string): ImpersonationPayload | null {
  const [encoded, signature] = raw.split('.')
  if (!encoded || !signature) return null

  const expected = signPayload(encoded)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as ImpersonationPayload
    if (
      !payload.email ||
      !payload.clerkUserId ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return null
    }
    return {
      email: payload.email.trim().toLowerCase(),
      exp: payload.exp,
      clerkUserId: payload.clerkUserId,
    }
  } catch {
    return null
  }
}

export function applyImpersonationCookieClear(response: NextResponse): void {
  const options = impersonationCookieClearOptions()
  response.cookies.set(options.name, options.value, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: options.maxAge,
  })
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies()
  const options = impersonationCookieClearOptions()
  cookieStore.set(options.name, options.value, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: options.maxAge,
  })
}

export async function readImpersonationEmail(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null

  const cookieStore = await cookies()
  const raw = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value
  if (!raw) return null

  const payload = decodePayload(raw)
  if (!payload || payload.clerkUserId !== userId) {
    return null
  }

  return payload.email
}

export async function setImpersonationCookie(email: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Cannot impersonate without an authenticated session')
  }

  const normalized = email.trim().toLowerCase()
  const payload = encodePayload({
    email: normalized,
    clerkUserId: userId,
    exp: Date.now() + IMPERSONATION_COOKIE_MAX_AGE_SEC * 1000,
  })
  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE_NAME, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: IMPERSONATION_COOKIE_MAX_AGE_SEC,
  })
}
