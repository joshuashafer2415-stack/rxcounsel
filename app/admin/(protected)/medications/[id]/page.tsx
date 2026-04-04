import { db } from '@/lib/db'
import { Medication, Script, Video, MedicationType } from '@/lib/types'
import { notFound } from 'next/navigation'
import MedicationSettingsForm from './MedicationSettingsForm'
import ScriptsSection from './ScriptsSection'
import VideosSection from './VideosSection'

export const dynamic = 'force-dynamic'

const VIDEO_TYPES: MedicationType[] = ['core', 'interactions', 'warnings', 'tips']

export default async function MedicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [medResult, scriptsResult, videosResult] = await Promise.all([
    db.from('medications').select('*').eq('id', id).single(),
    db.from('scripts').select('*').eq('medication_id', id),
    db.from('videos').select('*').eq('medication_id', id),
  ])

  if (medResult.error || !medResult.data) {
    notFound()
  }

  const medication = medResult.data as Medication
  const scripts = (scriptsResult.data || []) as Script[]
  const videos = (videosResult.data || []) as Video[]

  // Build lookup maps
  const scriptsByType = Object.fromEntries(scripts.map((s) => [s.type, s])) as Record<
    MedicationType,
    Script | undefined
  >
  const videosByType = Object.fromEntries(videos.map((v) => [v.type, v])) as Record<
    MedicationType,
    Video | undefined
  >

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Medications
        </a>
        <h1 className="text-2xl font-bold text-gray-900">{medication.generic_name}</h1>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            medication.published
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {medication.published ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Settings Section */}
      <MedicationSettingsForm medication={medication} />

      {/* Scripts Section */}
      <ScriptsSection
        medicationId={medication.id}
        scriptsByType={scriptsByType}
        videoTypes={VIDEO_TYPES}
      />

      {/* Videos Section */}
      <VideosSection
        medicationId={medication.id}
        videosByType={videosByType}
        videoTypes={VIDEO_TYPES}
        scriptsByType={scriptsByType}
      />
    </div>
  )
}
