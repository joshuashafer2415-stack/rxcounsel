import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Valid email and password (min 8 chars) required' }, { status: 400 })
  }
  const { data: existing } = await db.from('users').select('id').eq('email', email).single()
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }
  const password_hash = await bcrypt.hash(password, 12)
  const { error } = await db.from('users').insert({ email, password_hash, subscription_status: 'none' })
  if (error) return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 201 })
}
