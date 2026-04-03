import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getMedication, getMedicationByBrandSlug, getMedicationVideos } from '@/lib/medications'
import VideoPlayer from '@/components/VideoPlayer'
import LockedVideoCard from '@/components/LockedVideoCard'
import type { Video } from '@/lib/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const med = await getMedication(slug)
  if (!med) return {}

  const brandList = med.brand_names.join(', ')
  const title = brandList
    ? `${med.generic_name} (${brandList}) — Free Medication Counseling Video`
    : `${med.generic_name} — Free Medication Counseling Video`

  return {
    title,
    description: `Watch a free pharmacist counseling video for ${med.generic_name}${brandList ? ` (${brandList})` : ''}${med.drug_class ? `, a ${med.drug_class}` : ''}. Learn how to take it safely.`,
  }
}

export default async function MedicationPage({ params }: Props) {
  const { slug } = await params

  // Try direct slug match first
  let medication = await getMedication(slug)

  // If not found, check if it's a brand name slug and redirect
  if (!medication) {
    const byBrand = await getMedicationByBrandSlug(slug)
    if (byBrand) {
      permanentRedirect(`/medications/${byBrand.slug}`)
    }
    notFound()
  }

  const videos = await getMedicationVideos(medication.id)
  const coreVideo = videos.find((v: Video) => v.type === 'core') ?? null

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{medication.generic_name}</h1>
        {medication.brand_names.length > 0 && (
          <p className="text-gray-500 mt-1">
            Also known as: {medication.brand_names.join(', ')}
          </p>
        )}
        {medication.drug_class && (
          <span className="inline-block mt-2 text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full px-3 py-1">
            {medication.drug_class}
          </span>
        )}
      </div>

      {/* Core video (free) */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Core Counseling</h2>
          <span className="text-xs font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full px-2 py-0.5">
            FREE
          </span>
        </div>
        <VideoPlayer
          playbackId={coreVideo?.mux_playback_id ?? null}
          title={`${medication.generic_name} — Core Counseling`}
        />
      </section>

      {/* Locked supplemental videos */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Supplemental Videos</h2>
        <div className="space-y-3">
          <LockedVideoCard type="interactions" />
          <LockedVideoCard type="warnings" />
          <LockedVideoCard type="tips" />
        </div>
      </section>

      {/* Subscribe banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 text-center">
        <p className="font-semibold text-lg mb-1">Unlock All Videos</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Access drug interactions, warning signs, and dosing tips for every medication — $4.99/month.
        </p>
        <a
          href="/signup"
          className="inline-block bg-indigo-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-indigo-700 transition-colors"
        >
          Subscribe — $4.99/month
        </a>
      </div>
    </main>
  )
}
