import { describe, it, expect, vi } from 'vitest'

vi.mock('stripe', () => {
  const MockStripe = vi.fn(function () {
    this.checkout = { sessions: { create: vi.fn() } }
    this.webhooks = { constructEventAsync: vi.fn() }
  })
  return { default: MockStripe }
})

describe('stripe client', () => {
  it('exports a Stripe instance', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    vi.resetModules()
    const { stripe } = await import('@/lib/stripe')
    expect(stripe).toBeDefined()
    expect(stripe.checkout).toBeDefined()
  })

  it('throws if STRIPE_SECRET_KEY is missing', async () => {
    const original = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    vi.resetModules()
    await expect(import('@/lib/stripe')).rejects.toThrow('STRIPE_SECRET_KEY')
    process.env.STRIPE_SECRET_KEY = original
    vi.resetModules()
  })
})
