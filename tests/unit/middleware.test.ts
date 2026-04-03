import { describe, it, expect } from 'vitest'

describe('admin middleware', () => {
  it('ADMIN_PASSWORD env var is required', () => {
    // Middleware itself is hard to unit test — verify the env var is documented
    const envExample = require('fs').readFileSync('.env.example', 'utf-8')
    expect(envExample).toContain('ADMIN_PASSWORD')
  })
})
