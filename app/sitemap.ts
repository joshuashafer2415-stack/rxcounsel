import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rxcounsel-eight.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: medications } = await db
    .from('medications')
    .select('slug, created_at')
    .eq('published', true)

  const medicationUrls = (medications || []).map(med => ({
    url: `${baseUrl}/medications/${med.slug}`,
    lastModified: new Date(med.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    ...medicationUrls,
  ]
}
