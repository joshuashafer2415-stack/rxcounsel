'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-bold text-indigo-600 text-lg">RxCounsel</Link>
        <div className="flex items-center gap-4 text-sm">
          {status === 'loading' ? null : session ? (
            <>
              <span className="text-gray-500">{session.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
