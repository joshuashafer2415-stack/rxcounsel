import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// NextAuth v5 beta imports Next.js server internals incompatible with jsdom.
// We verify the auth module structure statically rather than importing it at runtime.
describe('auth config', () => {
  it('lib/auth.ts exists and exports expected names', () => {
    const authPath = path.resolve(__dirname, '../../lib/auth.ts')
    expect(fs.existsSync(authPath)).toBe(true)
    const content = fs.readFileSync(authPath, 'utf-8')
    expect(content).toContain('authConfig')
    expect(content).toContain('providers')
    expect(content).toContain('Credentials')
    expect(content).toContain('export const { handlers, auth, signIn, signOut }')
  })

  it('signup route exists and hashes passwords', () => {
    const routePath = path.resolve(__dirname, '../../app/api/auth/signup/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
    const content = fs.readFileSync(routePath, 'utf-8')
    expect(content).toContain('password_hash')
    expect(content).toContain('bcrypt.hash')
  })
})
