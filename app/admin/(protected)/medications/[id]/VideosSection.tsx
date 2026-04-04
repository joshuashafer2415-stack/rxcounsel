'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, MedicationType } from '@/lib/types'

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
}

function getVideoStatus(video: Video | undefined): string {
  if (!video) return 'No video'
  if (video.mux_playback_id) return 'Ready'
  if (video.mux_asset_id) return 'Processing'
  return 'Uploading'
}

export default function VideosSection({ medicationId, videosByType, videoTypes }: Props) {
  const router = useRouter()
  const fileInputRefs = useRef<Partial<Record<MedicationType, HTMLInputElement | null>>>({})
  const [uploadingType, setUploadingType] = useState<MedicationType | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Partial<Record<MedicationType, number>>>({})
  const [confirmingType, setConfirmingType] = useState<MedicationType | null>(null)
  const [errors, setErrors] = useState<Partial<Record<MedicationType, string>>>({})
  const [uploadIds, setUploadIds] = useState<Partial<Record<MedicationType, string>>>({})
  const [localVideos, setLocalVideos] =
    useState<Record<MedicationType, Video | undefined>>(videosByType)

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

                <div className="flex gap-2">
                  {pendingUploadId && (
                    <button
                      onClick={() => handleConfirm(type)}
                      disabled={isConfirming}
                      className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {isConfirming ? 'Confirming...' : 'Confirm Upload'}
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRefs.current[type]?.click()}
                    disabled={isUploading !== false && uploadingType !== null}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isUploading ? `Uploading ${progress ?? 0}%...` : video ? 'Replace Video' : 'Upload Video'}
                  </button>
                  <input
                    ref={(el) => { fileInputRefs.current[type] = el }}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelected(type, file)
                      e.target.value = ''
                    }}
                  />
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
