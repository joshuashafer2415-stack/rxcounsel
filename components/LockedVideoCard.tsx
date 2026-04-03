import Link from 'next/link'
import type { MedicationType } from '@/lib/types'

const VIDEO_LABELS: Record<Exclude<MedicationType, 'core'>, { title: string; description: string }> = {
  interactions: {
    title: 'Drug Interactions & Foods to Avoid',
    description: 'Learn what drugs and foods to avoid while taking this medication.',
  },
  warnings: {
    title: 'Warning Signs — When to Call Your Doctor',
    description: 'Know when to call your doctor or go to the ER.',
  },
  tips: {
    title: 'Missed Doses, Storage & Refill Tips',
    description: 'Practical tips for taking this medication correctly.',
  },
}

export default function LockedVideoCard({ type }: { type: Exclude<MedicationType, 'core'> }) {
  const { title, description } = VIDEO_LABELS[type]

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-lg">
        🔒
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <Link
        href="/signup"
        className="text-sm font-semibold text-indigo-600 hover:underline flex-shrink-0"
      >
        Unlock
      </Link>
    </div>
  )
}
