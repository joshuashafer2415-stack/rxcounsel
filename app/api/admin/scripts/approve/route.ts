import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { MedicationType } from '@/lib/types'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { scriptId, content } = body as { scriptId: string; content?: string }

  if (!scriptId) {
    return NextResponse.json({ error: 'scriptId is required' }, { status: 400 })
  }

  const updateFields: Record<string, unknown> = { status: 'approved', reviewed_at: new Date().toISOString() }
  if (content !== undefined) updateFields.content = content

  const { data, error } = await db
    .from('scripts')
    .update(updateFields)
    .eq('id', scriptId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
