'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Something went wrong')
    else router.push('/login?registered=true')
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create account</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-lg px-4 py-3 text-sm dark:bg-gray-800 dark:border-gray-700" />
        <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border rounded-lg px-4 py-3 text-sm dark:bg-gray-800 dark:border-gray-700" />
        <button type="submit" className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-indigo-700">Create account</button>
        <p className="text-center text-sm text-gray-500">Have an account? <a href="/login" className="text-indigo-600 hover:underline">Sign in</a></p>
      </form>
    </main>
  )
}
