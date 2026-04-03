import SearchBar from '@/components/SearchBar'
import MedicationCard from '@/components/MedicationCard'
import { getPopularMedications } from '@/lib/medications'

export default async function HomePage() {
  const medications = await getPopularMedications(12)

  return (
    <main className="min-h-screen">
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Free Medication Counseling Videos
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
          From a licensed pharmacist. Search by brand or generic name.
        </p>
        <SearchBar />
      </section>

      {medications.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-semibold mb-4">Popular Medications</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {medications.map(med => (
              <MedicationCard key={med.id} medication={med} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
