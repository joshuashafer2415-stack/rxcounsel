import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // Protect all /admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const adminPassword = process.env.ADMIN_PASSWORD
    const authHeader = req.headers.get('authorization')

    if (!adminPassword) {
      return new NextResponse('Admin password not configured', { status: 500 })
    }

    if (!authHeader) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="RxCounsel Admin"',
        },
      })
    }

    const encoded = authHeader.replace('Basic ', '')
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
    const [, password] = decoded.split(':')

    if (password !== adminPassword) {
      return new NextResponse('Incorrect password', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="RxCounsel Admin"',
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
