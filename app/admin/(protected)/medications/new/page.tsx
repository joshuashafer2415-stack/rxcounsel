'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewMedicationPage() {
  const router = useRouter()
  const [genericName, setGenericName] = useState('')
  const [brandNames, setBrandNames] = useState('')
  const [drugClass, setDrugClass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/medications', {
        method: 'POST',
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

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create medication')
        return
      }

      router.push(`/admin/medications/${data.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Medication</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
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
            placeholder="e.g. atorvastatin"
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
            placeholder="Lipitor, Torvast (comma-separated)"
          />
          <p className="mt-1 text-xs text-gray-500">Separate multiple brand names with commas</p>
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
            placeholder="e.g. Statin"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Creating...' : 'Create Medication'}
          </button>
          <a
            href="/admin"
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
