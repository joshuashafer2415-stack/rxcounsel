import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // Admin auth is handled via cookie check in /app/admin/layout.tsx
  // API routes check the cookie inline using isAdminRequest()
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
