import { db } from '@/lib/db'
import type { Medication, Video } from '@/lib/types'

export async function getMedication(slug: string): Promise<Medication | null> {
  const { data, error } = await db
    .from('medications')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Medication
}

/**
 * Finds a published medication whose brand_names array contains the given slug.
 * Brand names are stored lowercase (e.g. 'zestril') to match URL slugs.
 */
export async function getMedicationByBrandSlug(brandSlug: string): Promise<Medication | null> {
  const { data, error } = await db
    .from('medications')
    .select('*')
    .eq('published', true)
    .limit(1000)

  if (error || !data) return null

  const match = (data as Medication[]).find(med =>
    med.brand_names.some(b => b.toLowerCase() === brandSlug.toLowerCase())
  )
  return match ?? null
}

export async function getMedicationVideos(medicationId: string): Promise<Video[]> {
  const { data, error } = await db
    .from('videos')
    .select('*')
    .eq('medication_id', medicationId)

  if (error || !data) return []
  return data as Video[]
}

export async function getPopularMedications(limit = 12): Promise<Medication[]> {
  const { data, error } = await db
    .from('medications')
    .select('*')
    .eq('published', true)
    .order('generic_name', { ascending: true })
    .limit(limit)

  if (error || !data) return []
  return data as Medication[]
}
