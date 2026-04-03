'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) setError('Invalid email or password')
    else router.push('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-lg px-4 py-3 text-sm dark:bg-gray-800 dark:border-gray-700" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border rounded-lg px-4 py-3 text-sm dark:bg-gray-800 dark:border-gray-700" />
        <button type="submit" className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-indigo-700">Sign in</button>
        <p className="text-center text-sm text-gray-500">No account? <a href="/signup" className="text-indigo-600 hover:underline">Sign up</a></p>
      </form>
    </main>
  )
}
