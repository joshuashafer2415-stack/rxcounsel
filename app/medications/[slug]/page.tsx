import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getMedication, getMedicationByBrandSlug, getMedicationVideos } from '@/lib/medications'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { signMuxPlaybackId } from '@/lib/mux-signing'
import VideoPlayer from '@/components/VideoPlayer'
import LockedVideoCard from '@/components/LockedVideoCard'
import SubscribeButton from '@/components/SubscribeButton'
import type { Video, MedicationType } from '@/lib/types'

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

async function checkSubscription(userId: string): Promise<boolean> {
  const { data } = await db
    .from('users')
    .select('subscription_status, subscription_period_end')
    .eq('id', userId)
    .single()

  if (!data) return false

  const isActive = data.subscription_status === 'active'
  const notExpired =
    !data.subscription_period_end ||
    new Date(data.subscription_period_end) > new Date()

  return isActive && notExpired
}

const SUPPLEMENTAL_TYPES: Exclude<MedicationType, 'core'>[] = [
  'interactions',
  'warnings',
  'tips',
]

const VIDEO_TITLES: Record<Exclude<MedicationType, 'core'>, string> = {
  interactions: 'Drug Interactions & Foods to Avoid',
  warnings: 'Warning Signs — When to Call Your Doctor',
  tips: 'Missed Doses, Storage & Refill Tips',
}

export default async function MedicationPage({ params }: Props) {
  const { slug } = await params

  let medication = await getMedication(slug)

  if (!medication) {
    const byBrand = await getMedicationByBrandSlug(slug)
    if (byBrand) permanentRedirect(`/medications/${byBrand.slug}`)
    notFound()
  }

  const [videos, session] = await Promise.all([
    getMedicationVideos(medication.id),
    auth(),
  ])

  const coreVideo = videos.find((v: Video) => v.type === 'core') ?? null

  // Check subscription by querying DB directly — never rely on cached JWT token
  let isSubscribed = false
  if (session?.user?.id) {
    isSubscribed = await checkSubscription(session.user.id)
  }

  // Generate Mux signed tokens for subscribed users
  const signedTokens: Partial<Record<MedicationType, string>> = {}
  if (isSubscribed) {
    await Promise.all(
      SUPPLEMENTAL_TYPES.map(async (type) => {
        const video = videos.find((v: Video) => v.type === type)
        if (video?.mux_playback_id) {
          try {
            signedTokens[type] = await signMuxPlaybackId(video.mux_playback_id)
          } catch {
            // Signing failure keeps the video locked — page still renders
          }
        }
      })
    )
  }

  // Unlock action: subscribe button (logged in) or login link (not logged in)
  const unlockAction = session?.user ? (
    <SubscribeButton
      medicationSlug={slug}
      className="text-sm font-semibold text-indigo-600 hover:underline"
    >
      Unlock
    </SubscribeButton>
  ) : (
    <Link
      href={`/login?callbackUrl=${encodeURIComponent(`/medications/${slug}`)}`}
      className="text-sm font-semibold text-indigo-600 hover:underline"
    >
      Unlock
    </Link>
  )

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

      {/* Supplemental videos */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Supplemental Videos</h2>
        <div className="space-y-3">
          {SUPPLEMENTAL_TYPES.map((type) => {
            const video = videos.find((v: Video) => v.type === type)
            const token = signedTokens[type]

            if (isSubscribed && token && video?.mux_playback_id) {
              return (
                <div
                  key={type}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-5"
                >
                  <h3 className="font-semibold mb-3">{VIDEO_TITLES[type]}</h3>
                  <VideoPlayer
                    playbackId={video.mux_playback_id}
                    playbackToken={token}
                    title={`${medication.generic_name} — ${VIDEO_TITLES[type]}`}
                  />
                </div>
              )
            }

            return (
              <LockedVideoCard
                key={type}
                type={type}
                action={unlockAction}
              />
            )
          })}
        </div>
      </section>

      {/* Subscribe banner — hidden once subscribed */}
      {!isSubscribed && (
        <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 text-center">
          <p className="font-semibold text-lg mb-1">Unlock All Videos</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Access drug interactions, warning signs, and dosing tips for every medication — $4.99/month.
          </p>
          <SubscribeButton medicationSlug={slug} />
        </div>
      )}
    </main>
  )
}
