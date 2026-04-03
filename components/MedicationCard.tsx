import Link from 'next/link'
import type { Medication } from '@/lib/types'

export default function MedicationCard({ medication }: { medication: Medication }) {
  return (
    <Link
      href={`/medications/${medication.slug}`}
      className="block border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-indigo-400 hover:shadow-sm transition-all"
    >
      <p className="font-semibold text-gray-900 dark:text-gray-100">{medication.generic_name}</p>
      {medication.brand_names.length > 0 && (
        <p className="text-sm text-gray-500 mt-0.5">{medication.brand_names[0]}</p>
      )}
      {medication.drug_class && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{medication.drug_class}</p>
      )}
    </Link>
  )
}
