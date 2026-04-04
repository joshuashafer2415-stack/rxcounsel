import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { db } from '@/lib/db'

function generateSlug(genericName: string): string {
  return genericName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { generic_name, brand_names, drug_class } = body

  if (!generic_name || typeof generic_name !== 'string') {
    return NextResponse.json({ error: 'generic_name is required' }, { status: 400 })
  }

  const slug = generateSlug(generic_name)

  const { data, error } = await db
    .from('medications')
    .insert({
      generic_name: generic_name.trim(),
      brand_names: Array.isArray(brand_names) ? brand_names : [],
      drug_class: drug_class || null,
      slug,
      published: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
