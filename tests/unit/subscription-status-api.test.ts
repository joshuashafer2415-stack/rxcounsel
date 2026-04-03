import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSession = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: mockSession }))

const mockDbSingle = vi.fn()
vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockDbSingle,
        })),
      })),
    })),
  },
}))

describe('GET /api/subscription/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 if not authenticated', async () => {
    mockSession.mockResolvedValue(null)
    const { GET } = await import('@/app/api/subscription/status/route')
    const res = await GET(new NextRequest('http://localhost/api/subscription/status'))
    expect(res.status).toBe(401)
  })

  it('returns subscription status for authenticated user', async () => {
    mockSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockDbSingle.mockResolvedValue({
      data: {
        subscription_status: 'active',
        subscription_period_end: '2026-05-01T00:00:00Z',
      },
      error: null,
    })
    const { GET } = await import('@/app/api/subscription/status/route')
    const res = await GET(new NextRequest('http://localhost/api/subscription/status'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('active')
    expect(body.subscriptionPeriodEnd).toBe('2026-05-01T00:00:00Z')
  })

  it('returns none status for user with no subscription', async () => {
    mockSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockDbSingle.mockResolvedValue({
      data: { subscription_status: 'none', subscription_period_end: null },
      error: null,
    })
    const { GET } = await import('@/app/api/subscription/status/route')
    const res = await GET(new NextRequest('http://localhost/api/subscription/status'))
    const body = await res.json()
    expect(body.status).toBe('none')
  })
})
