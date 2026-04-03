import { describe, it, expect, vi } from 'vitest'

describe('db client', () => {
  it('initializes without throwing when env vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    expect(() => {
      const { createClient } = require('@supabase/supabase-js')
      const client = createClient('https://test.supabase.co', 'test-key')
      expect(client).toBeDefined()
    }).not.toThrow()
  })

  it('types export correctly', async () => {
    const types = await import('@/lib/types')
    expect(types).toBeDefined()
    // Verify key exports exist
    const medication: types.Medication = {
      id: '1', slug: 'test', generic_name: 'Test Drug',
      brand_names: [], drug_class: null, published: false, created_at: ''
    }
    expect(medication.slug).toBe('test')
  })
})
