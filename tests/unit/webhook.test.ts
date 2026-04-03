import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockConstructEvent = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEventAsync: mockConstructEvent },
  },
}))

// DB mock supports both update (write) and select (lookup by subscription ID)
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null })
const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle })
const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq })

vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn(() => ({
      update: mockUpdate,
      select: mockSelect,
    })),
  },
}))

function makeRequest(signature = 'valid-sig') {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body: '{}',
    headers: { 'stripe-signature': signature },
  })
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    mockUpdateEq.mockResolvedValue({ error: null })
    mockSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null })
  })

  it('returns 400 if signature verification fails', async () => {
    mockConstructEvent.mockRejectedValue(new Error('Invalid signature'))
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(400)
  })

  it('handles checkout.session.completed — sets active, stores customer and subscription IDs', async () => {
    mockConstructEvent.mockResolvedValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user-1' },
          customer: 'cus_123',
          subscription: 'sub_123',
        },
      },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: 'active',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
      })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('handles invoice.paid — updates period_end by looking up user via stripe_subscription_id', async () => {
    mockConstructEvent.mockResolvedValue({
      type: 'invoice.paid',
      data: {
        object: {
          subscription: 'sub_123',
          lines: { data: [{ period: { end: 1746057600 } }] },
        },
      },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(mockSelectEq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_123')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_period_end: expect.any(String) })
    )
  })

  it('handles customer.subscription.updated — syncs status and period_end via stripe_subscription_id', async () => {
    mockConstructEvent.mockResolvedValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          current_period_end: 1746057600,
        },
      },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(mockSelectEq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_123')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: 'active',
        subscription_period_end: expect.any(String),
      })
    )
  })

  it('handles customer.subscription.deleted — sets canceled via stripe_subscription_id', async () => {
    mockConstructEvent.mockResolvedValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123' } },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(mockSelectEq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_123')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'canceled' })
    )
  })

  it('handles invoice.payment_failed — sets past_due via stripe_subscription_id', async () => {
    mockConstructEvent.mockResolvedValue({
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_123' } },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(mockSelectEq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_123')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'past_due' })
    )
  })

  it('returns 200 for unhandled event types', async () => {
    mockConstructEvent.mockResolvedValue({
      type: 'payment_intent.created',
      data: { object: {} },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
  })
})
