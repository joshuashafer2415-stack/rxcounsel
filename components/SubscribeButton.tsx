'use client'
import { useState } from 'react'

interface Props {
  medicationSlug?: string
  className?: string
  children?: React.ReactNode
}

export default function SubscribeButton({ medicationSlug, className, children }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSlug: medicationSlug }),
      })
      if (res.status === 401) {
        const callbackUrl = medicationSlug ? `/medications/${medicationSlug}` : '/'
        window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        return
      }
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={
        className ??
        'inline-block bg-indigo-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-indigo-700 transition-colors disabled:opacity-60'
      }
    >
      {loading ? 'Redirecting...' : (children ?? 'Subscribe — $4.99/month')}
    </button>
  )
}
