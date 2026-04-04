import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import AdminSignOutButton from './AdminSignOutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authenticated = await isAdminAuthenticated()

  if (!authenticated) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/admin" className="text-lg font-bold text-indigo-700">
            RxCounsel Admin
          </a>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
              Medications
            </a>
            <AdminSignOutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
