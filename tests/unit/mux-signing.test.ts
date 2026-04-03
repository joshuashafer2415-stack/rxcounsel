import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignPlaybackId = vi.fn().mockResolvedValue('mock-jwt-token')

vi.mock('@mux/mux-node', () => {
  function MockMux() {
    return { jwt: { signPlaybackId: mockSignPlaybackId } }
  }
  return { Mux: MockMux }
})

describe('signMuxPlaybackId', () => {
  beforeEach(() => {
    process.env.MUX_SIGNING_KEY_ID = 'test-key-id'
    process.env.MUX_SIGNING_PRIVATE_KEY = 'test-private-key'
    vi.resetModules()
  })

  it('returns a signed JWT token for a playback ID', async () => {
    const { signMuxPlaybackId } = await import('@/lib/mux-signing')
    const token = await signMuxPlaybackId('test-playback-id')
    expect(token).toBe('mock-jwt-token')
  })

  it('throws if MUX_SIGNING_KEY_ID is missing', async () => {
    delete process.env.MUX_SIGNING_KEY_ID
    const { signMuxPlaybackId } = await import('@/lib/mux-signing')
    await expect(signMuxPlaybackId('test-id')).rejects.toThrow('MUX_SIGNING_KEY_ID')
  })

  it('throws if MUX_SIGNING_PRIVATE_KEY is missing', async () => {
    delete process.env.MUX_SIGNING_PRIVATE_KEY
    const { signMuxPlaybackId } = await import('@/lib/mux-signing')
    await expect(signMuxPlaybackId('test-id')).rejects.toThrow('MUX_SIGNING_PRIVATE_KEY')
  })
})
