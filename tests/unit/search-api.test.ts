import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn((table: string) => {
      if (table === 'search_logs') {
        return { insert: vi.fn().mockReturnValue({ then: vi.fn() }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              slug: 'lisinopril',
              generic_name: 'Lisinopril',
              brand_names: ['zestril'],
              drug_class: 'ACE Inhibitor',
              published: true,
            },
          ],
          error: null,
        }),
      }
    }),
  },
}))

describe('GET /api/search', () => {
  it('returns matching medications for a query', async () => {
    const { GET } = await import('@/app/api/search/route')
    const req = new NextRequest('http://localhost/api/search?q=lisinopril')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(body.results)).toBe(true)
  })

  it('returns 400 if query is missing', async () => {
    const { GET } = await import('@/app/api/search/route')
    const req = new NextRequest('http://localhost/api/search')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
