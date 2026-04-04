'use client'

import { useRouter } from 'next/navigation'

export default function AdminSignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-gray-800"
    >
      Sign out
    </button>
  )
}
