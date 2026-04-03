'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  slug: string
  generic_name: string
  brand_names: string[]
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)

    if (value.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(slug: string) {
    setQuery('')
    setResults([])
    router.push(`/medications/${slug}`)
  }

  return (
    <div className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="e.g. Lipitor or atorvastatin..."
        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-5 py-4 text-base bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {loading && (
        <p className="absolute right-4 top-4 text-sm text-gray-400">Searching...</p>
      )}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {results.map(med => (
            <li key={med.slug}>
              <button
                onClick={() => handleSelect(med.slug)}
                className="w-full text-left px-5 py-3 hover:bg-indigo-50 dark:hover:bg-gray-700"
              >
                <span className="font-medium">{med.generic_name}</span>
                {med.brand_names.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({med.brand_names.join(', ')})
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
