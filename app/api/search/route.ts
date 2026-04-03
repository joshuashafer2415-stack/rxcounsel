import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const term = query.trim()

  // Log the search (fire and forget — don't block the response)
  db.from('search_logs').insert({ query: term }).then(() => {})

  // Search by generic name (partial match)
  const { data: byGeneric } = await db
    .from('medications')
    .select('id, slug, generic_name, brand_names, drug_class')
    .ilike('generic_name', `%${term}%`)
    .eq('published', true)
    .limit(10)

  // Search by brand name (partial match)
  const { data: byBrand } = await db
    .from('medications')
    .select('id, slug, generic_name, brand_names, drug_class')
    .ilike('brand_names::text', `%${term}%`)
    .eq('published', true)
    .limit(10)

  // Deduplicate by id
  const combined = [...(byGeneric || []), ...(byBrand || [])]
  const seen = new Set<string>()
  const results = combined.filter(med => {
    if (seen.has(med.id)) return false
    seen.add(med.id)
    return true
  })

  return NextResponse.json({ results })
}
