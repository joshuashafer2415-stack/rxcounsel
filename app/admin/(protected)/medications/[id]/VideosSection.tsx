'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Script, MedicationType } from '@/lib/types'

const TYPE_LABELS: Record<MedicationType, string> = {
  core: 'Core (Free)',
  interactions: 'Drug Interactions',
  warnings: 'Warning Signs',
  tips: 'Missed Dose & Tips',
}

interface Props {
  medicationId: string
  videosByType: Record<MedicationType, Video | undefined>
  videoTypes: MedicationType[]
  scriptsByType: Record<MedicationType, Script | undefined>
}

type HeyGenState =
  | { phase: 'idle' }
  | { phase: 'generating' }
  | { phase: 'importing' }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

function getVideoStatus(video: Video | undefined): string {
  if (!video) return 'No video'
  if (video.mux_playback_id) return 'Ready'
  if (video.mux_asset_id) return 'Processing'
  return 'Uploading'
}

export default function VideosSection({
  medicationId,
  videosByType,
  videoTypes,
  scriptsByType,
}: Props) {
  const router = useRouter()
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [uploadingType, setUploadingType] = useState<MedicationType | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Partial<Record<MedicationType, number>>>({})
  const [confirmingType, setConfirmingType] = useState<MedicationType | null>(null)
  const [errors, setErrors] = useState<Partial<Record<MedicationType, string>>>({})
  const [uploadIds, setUploadIds] = useState<Partial<Record<MedicationType, string>>>({})
  const [localVideos, setLocalVideos] =
    useState<Record<MedicationType, Video | undefined>>(videosByType)
  const [heygenStates, setHeygenStates] = useState<
    Partial<Record<MedicationType, HeyGenState>>
  >({})

  // Returns true if any HeyGen generation is currently in progress
  const anyHeygenInProgress = Object.values(heygenStates).some(
    (s) => s?.phase === 'generating' || s?.phase === 'importing'
  )

  async function handleFileSelected(type: MedicationType, file: File) {
    setUploadingType(type)
    setUploadProgress((prev) => ({ ...prev, [type]: 0 }))
    setErrors((prev) => ({ ...prev, [type]: undefined }))

    try {
      // Get a direct upload URL from Mux
      const res = await fetch(
        `/api/admin/videos/upload-url?medicationId=${encodeURIComponent(medicationId)}&type=${type}`
      )
      const data = await res.json()

      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [type]: data.error || 'Failed to get upload URL' }))
        return
      }

      const { uploadUrl, uploadId } = data

      // Upload the file directly to Mux via PUT
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((prev) => ({
              ...prev,
              [type]: Math.round((e.loaded / e.total) * 100),
            }))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      setUploadProgress((prev) => ({ ...prev, [type]: 100 }))
      setUploadIds((prev) => ({ ...prev, [type]: uploadId }))
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [type]: err.message || 'Upload failed' }))
    } finally {
      setUploadingType(null)
    }
  }

  async function handleConfirm(type: MedicationType) {
    const uploadId = uploadIds[type]
    if (!uploadId) {
      setErrors((prev) => ({ ...prev, [type]: 'No pending upload. Upload a file first.' }))
      return
    }

    setConfirmingType(type)
    setErrors((prev) => ({ ...prev, [type]: undefined }))

    try {
      const res = await fetch('/api/admin/videos/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId, type, uploadId }),
      })

      const data = await res.json()

      if (res.status === 202) {
        setErrors((prev) => ({
          ...prev,
          [type]: 'Still processing — wait a moment and try Confirm again.',
        }))
        return
      }

      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [type]: data.error || 'Confirmation failed' }))
        return
      }

      setLocalVideos((prev) => ({ ...prev, [type]: data }))
      setUploadIds((prev) => ({ ...prev, [type]: undefined }))
      setUploadProgress((prev) => ({ ...prev, [type]: undefined }))
      router.refresh()
    } catch {
      setErrors((prev) => ({ ...prev, [type]: 'Something went wrong' }))
    } finally {
      setConfirmingType(null)
    }
  }

  async function handleHeyGenGenerate(type: MedicationType) {
    const script = scriptsByType[type]
    if (!script?.content) return

    setHeygenStates((prev) => ({ ...prev, [type]: { phase: 'generating' } }))
    setErrors((prev) => ({ ...prev, [type]: undefined }))

    try {
      // Step 1: Kick off HeyGen video generation
      const genRes = await fetch('/api/admin/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId, type, scriptContent: script.content }),
      })
      const genData = await genRes.json()

      if (!genRes.ok) {
        setHeygenStates((prev) => ({
          ...prev,
          [type]: { phase: 'error', message: genData.error || 'Generation failed' },
        }))
        return
      }

      const { videoId } = genData

      // Step 2: Poll for completion every 5 seconds
      let videoUrl: string | null = null
      for (let attempt = 0; attempt < 72; attempt++) {
        // max ~6 minutes
        await new Promise((r) => setTimeout(r, 5000))

        const statusRes = await fetch(
          `/api/admin/videos/heygen-status?videoId=${encodeURIComponent(videoId)}`
        )
        const statusData = await statusRes.json()

        if (!statusRes.ok) {
          setHeygenStates((prev) => ({
            ...prev,
            [type]: { phase: 'error', message: statusData.error || 'Status check failed' },
          }))
          return
        }

        if (statusData.status === 'completed' && statusData.videoUrl) {
          videoUrl = statusData.videoUrl
          break
        }

        if (statusData.status === 'failed') {
          setHeygenStates((prev) => ({
            ...prev,
            [type]: { phase: 'error', message: 'HeyGen video generation failed' },
          }))
          return
        }
      }

      if (!videoUrl) {
        setHeygenStates((prev) => ({
          ...prev,
          [type]: { phase: 'error', message: 'Timed out waiting for HeyGen to complete' },
        }))
        return
      }

      // Step 3: Import the completed video into Mux
      setHeygenStates((prev) => ({ ...prev, [type]: { phase: 'importing' } }))

      const importRes = await fetch('/api/admin/videos/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId, type, videoUrl }),
      })
      const importData = await importRes.json()

      if (!importRes.ok) {
        setHeygenStates((prev) => ({
          ...prev,
          [type]: { phase: 'error', message: importData.error || 'Import to Mux failed' },
        }))
        return
      }

      // Success — update local video state
      setLocalVideos((prev) => ({ ...prev, [type]: importData }))
      setHeygenStates((prev) => ({ ...prev, [type]: { phase: 'done' } }))
      router.refresh()
    } catch (err: any) {
      setHeygenStates((prev) => ({
        ...prev,
        [type]: { phase: 'error', message: err.message || 'Unexpected error' },
      }))
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Videos</h2>

      <div className="space-y-4">
        {videoTypes.map((type) => {
          const video = localVideos[type]
          const status = getVideoStatus(video)
          const isUploading = uploadingType === type
          const isConfirming = confirmingType === type
          const pendingUploadId = uploadIds[type]
          const progress = uploadProgress[type]
          const heygenState = heygenStates[type] ?? { phase: 'idle' }
          const script = scriptsByType[type]
          const hasApprovedScript = script?.status === 'approved' && !!script?.content
          const heygenBusy =
            heygenState.phase === 'generating' || heygenState.phase === 'importing'
          const anyBusy = uploadingType !== null || anyHeygenInProgress

          return (
            <div key={type} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{TYPE_LABELS[type]}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Status:{' '}
                    <span
                      className={
                        status === 'Ready'
                          ? 'text-green-600 font-medium'
                          : status === 'Processing'
                          ? 'text-yellow-600 font-medium'
                          : 'text-gray-500'
                      }
                    >
                      {status}
                    </span>
                    {video?.mux_playback_id && (
                      <span className="ml-2 text-xs text-gray-400">
                        ID: {video.mux_playback_id.slice(0, 12)}...
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  {pendingUploadId && (
                    <button
                      onClick={() => handleConfirm(type)}
                      disabled={isConfirming}
                      className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {isConfirming ? 'Confirming...' : 'Confirm Upload'}
                    </button>
                  )}

                  {/* HeyGen Generate button — only shown when there is an approved script */}
                  {hasApprovedScript && (
                    <button
                      onClick={() => handleHeyGenGenerate(type)}
                      disabled={anyBusy}
                      className="bg-violet-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                    >
                      {heygenBusy
                        ? heygenState.phase === 'importing'
                          ? 'Importing to Mux...'
                          : 'Generating...'
                        : video
                        ? 'Regenerate with HeyGen'
                        : 'Generate with HeyGen'}
                    </button>
                  )}

                  <label
                    className={`bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 cursor-pointer ${
                      anyBusy ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isUploading
                      ? `Uploading ${progress ?? 0}%...`
                      : video
                      ? 'Replace Video'
                      : 'Upload Video'}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={anyBusy}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelected(type, file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>

              {isUploading && progress !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Uploading to Mux... {progress}%</p>
                </div>
              )}

              {heygenState.phase === 'generating' && (
                <p className="text-violet-600 text-sm mt-2">
                  Generating avatar video... (this takes 2-5 minutes)
                </p>
              )}

              {heygenState.phase === 'importing' && (
                <p className="text-violet-600 text-sm mt-2">
                  Importing completed video to Mux...
                </p>
              )}

              {heygenState.phase === 'done' && (
                <p className="text-green-600 text-sm mt-2 font-medium">
                  HeyGen video imported successfully.
                </p>
              )}

              {heygenState.phase === 'error' && (
                <p className="text-red-600 text-sm mt-2">
                  HeyGen error: {heygenState.message}
                </p>
              )}

              {pendingUploadId && !isUploading && !errors[type] && (
                <p className="text-blue-600 text-sm mt-2">
                  Upload complete. Click &quot;Confirm Upload&quot; to save.
                </p>
              )}

              {errors[type] && (
                <p className="text-red-600 text-sm mt-2">{errors[type]}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
