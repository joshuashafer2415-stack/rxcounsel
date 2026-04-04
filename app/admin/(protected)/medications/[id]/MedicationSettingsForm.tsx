'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Medication } from '@/lib/types'

export default function MedicationSettingsForm({ medication }: { medication: Medication }) {
  const router = useRouter()
  const [genericName, setGenericName] = useState(medication.generic_name)
  const [brandNames, setBrandNames] = useState(medication.brand_names?.join(', ') || '')
  const [drugClass, setDrugClass] = useState(medication.drug_class || '')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await fetch(`/api/admin/medications/${medication.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generic_name: genericName,
          brand_names: brandNames
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          drug_class: drugClass || null,
        }),
      })

      if (res.ok) {
        setMessage('Saved successfully')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishToggle() {
    setToggling(true)
    setMessage('')
    setError('')

    try {
      const res = await fetch(`/api/admin/medications/${medication.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !medication.published }),
      })

      if (res.ok) {
        setMessage(medication.published ? 'Unpublished' : 'Published')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setToggling(false)
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>

      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Generic Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={genericName}
            onChange={(e) => setGenericName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Names
          </label>
          <input
            type="text"
            value={brandNames}
            onChange={(e) => setBrandNames(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Comma-separated"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Drug Class
          </label>
          <input
            type="text"
            value={drugClass}
            onChange={(e) => setDrugClass(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handlePublishToggle}
            disabled={toggling}
            className={`px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 ${
              medication.published
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            {toggling
              ? 'Updating...'
              : medication.published
              ? 'Unpublish'
              : 'Publish'}
          </button>
        </div>
      </form>
    </section>
  )
}
