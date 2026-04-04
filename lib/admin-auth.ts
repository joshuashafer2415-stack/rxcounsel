import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export const ADMIN_COOKIE_NAME = 'admin_session'
export const ADMIN_COOKIE_VALUE = 'authenticated'

/**
 * Server component check — reads the cookie store from next/headers.
 * Use this in layouts and server components.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === ADMIN_COOKIE_VALUE
}

/**
 * API route check — reads from the incoming NextRequest.
 * Use this in route handlers.
 */
export function isAdminRequest(req: NextRequest): boolean {
  return req.cookies.get(ADMIN_COOKIE_NAME)?.value === ADMIN_COOKIE_VALUE
}
