import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSession = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: mockSession }))

const mockCreateSession = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: mockCreateSession } },
  },
}))

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

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_ID = 'price_test123'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
    vi.resetModules()
  })

  it('returns 401 if not authenticated', async () => {
    mockSession.mockResolvedValue(null)
    const { POST } = await import('@/app/api/checkout/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(401)
  })

  it('creates a checkout session and returns URL', async () => {
    mockSession.mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } })
    mockDbSingle.mockResolvedValue({
      data: { id: 'user-1', email: 'test@example.com', stripe_customer_id: null },
      error: null,
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' })

    const { POST } = await import('@/app/api/checkout/route')
    const res = await POST(makeRequest({ returnSlug: 'lisinopril' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test')
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        metadata: expect.objectContaining({ userId: 'user-1' }),
      })
    )
  })

  it('uses existing stripe_customer_id when present', async () => {
    mockSession.mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } })
    mockDbSingle.mockResolvedValue({
      data: { id: 'user-1', email: 'test@example.com', stripe_customer_id: 'cus_existing' },
      error: null,
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' })

    const { POST } = await import('@/app/api/checkout/route')
    await POST(makeRequest({}))

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' })
    )
  })

  it('uses customer_email when no stripe_customer_id', async () => {
    mockSession.mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } })
    mockDbSingle.mockResolvedValue({
      data: { id: 'user-1', email: 'test@example.com', stripe_customer_id: null },
      error: null,
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' })

    const { POST } = await import('@/app/api/checkout/route')
    await POST(makeRequest({}))

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ customer_email: 'test@example.com' })
    )
  })
})
