'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Script, MedicationType } from '@/lib/types'

const TYPE_LABELS: Record<MedicationType, string> = {
  core: 'Core (90 sec)',
  interactions: 'Drug Interactions (60 sec)',
  warnings: 'Warning Signs (60 sec)',
  tips: 'Missed Dose & Tips (60 sec)',
}

interface Props {
  medicationId: string
  scriptsByType: Record<MedicationType, Script | undefined>
  videoTypes: MedicationType[]
}

export default function ScriptsSection({ medicationId, scriptsByType, videoTypes }: Props) {
  const router = useRouter()
  const [generatingType, setGeneratingType] = useState<MedicationType | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<MedicationType, string>>>({})
  const [localScripts, setLocalScripts] =
    useState<Record<MedicationType, Script | undefined>>(scriptsByType)

  async function handleGenerate(type: MedicationType) {
    setGeneratingType(type)
    setErrors((prev) => ({ ...prev, [type]: undefined }))

    try {
      const res = await fetch('/api/admin/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId, type }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [type]: data.error || 'Generation failed' }))
        return
      }

      setLocalScripts((prev) => ({ ...prev, [type]: data }))
      router.refresh()
    } catch {
      setErrors((prev) => ({ ...prev, [type]: 'Something went wrong' }))
    } finally {
      setGeneratingType(null)
    }
  }

  async function handleApprove(type: MedicationType) {
    const script = localScripts[type]
    if (!script) return

    setApprovingId(script.id)

    try {
      const res = await fetch('/api/admin/scripts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: script.id }),
      })

      const data = await res.json()

      if (res.ok) {
        setLocalScripts((prev) => ({ ...prev, [type]: data }))
        router.refresh()
      } else {
        setErrors((prev) => ({ ...prev, [type]: data.error || 'Approval failed' }))
      }
    } catch {
      setErrors((prev) => ({ ...prev, [type]: 'Something went wrong' }))
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Scripts</h2>

      <div className="space-y-6">
        {videoTypes.map((type) => {
          const script = localScripts[type]
          const isGenerating = generatingType === type
          const isApproving = approvingId === script?.id

          return (
            <div key={type} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{TYPE_LABELS[type]}</h3>
                <div className="flex gap-2">
                  {script && script.status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(type)}
                      disabled={isApproving}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50"
                    >
                      {isApproving ? 'Approving...' : 'Approve'}
                    </button>
                  )}
                  {script?.status === 'approved' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  )}
                  <button
                    onClick={() => handleGenerate(type)}
                    disabled={isGenerating !== false && generatingType !== null}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : script ? 'Regenerate' : 'Generate Script'}
                  </button>
                </div>
              </div>

              {errors[type] && (
                <p className="text-red-600 text-sm mb-2">{errors[type]}</p>
              )}

              {script?.content ? (
                <textarea
                  defaultValue={script.content}
                  rows={8}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  readOnly
                />
              ) : (
                <p className="text-gray-400 text-sm italic">
                  No script yet. Click &quot;Generate Script&quot; to create one.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
