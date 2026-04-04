import { db } from '@/lib/db'
import { Medication } from '@/lib/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { data: medications, error } = await db
    .from('medications')
    .select('*')
    .order('generic_name', { ascending: true })

  if (error) {
    return (
      <div>
        <p className="text-red-600">Failed to load medications: {error.message}</p>
      </div>
    )
  }

  const meds = (medications || []) as Medication[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
        <Link
          href="/admin/medications/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          Add Medication
        </Link>
      </div>

      {meds.length === 0 ? (
        <p className="text-gray-500">No medications yet. Add the first one.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generic Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand Names
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drug Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {meds.map((med) => (
                <tr key={med.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {med.generic_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {med.brand_names?.join(', ') || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {med.drug_class || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        med.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {med.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/medications/${med.id}`}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
