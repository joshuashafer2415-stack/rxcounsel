'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnSlug = searchParams.get('slug')
  const [message, setMessage] = useState('Setting up your account...')
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 5 // 5 × 2s = 10s

    async function poll() {
      try {
        const res = await fetch('/api/subscription/status')
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'active') {
            setMessage('Subscription active! Redirecting...')
            router.push(returnSlug ? `/medications/${returnSlug}` : '/')
            return
          }
        }
      } catch {
        // Network error — keep trying
      }

      attempts++
      if (attempts >= maxAttempts) {
        setTimedOut(true)
        return
      }
      setTimeout(poll, 2000)
    }

    const timer = setTimeout(poll, 2000)
    return () => clearTimeout(timer)
  }, [router, returnSlug])

  if (timedOut) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-3">Almost there!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your subscription is being set up. Please refresh the page to access your videos.
          </p>
          <button
            onClick={() => router.push(returnSlug ? `/medications/${returnSlug}` : '/')}
            className="bg-indigo-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-indigo-700"
          >
            {returnSlug ? 'Go to medication page' : 'Go home'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 text-center">
      <div>
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{message}</h1>
      </div>
    </main>
  )
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
