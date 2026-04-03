import { describe, it, expect, vi } from 'vitest'

const knownBrandSlugs = ['zestril', 'prinivil']
const lisinoprilMed = {
  id: '1',
  slug: 'lisinopril',
  generic_name: 'Lisinopril',
  brand_names: ['zestril', 'prinivil'],
  drug_class: 'ACE Inhibitor',
  published: true,
  created_at: '2026-01-01',
}

vi.mock('@/lib/db', () => {
  let lastContainsArg: string[] = []
  return {
    db: {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        contains: vi.fn().mockImplementation((_col: string, val: string[]) => {
          lastContainsArg = val
          return {
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
              const slug = lastContainsArg[0]
              if (knownBrandSlugs.includes(slug)) {
                return Promise.resolve({ data: lisinoprilMed, error: null })
              }
              return Promise.resolve({ data: null, error: { message: 'not found' } })
            }),
          }
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [lisinoprilMed],
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: lisinoprilMed,
          error: null,
        }),
      })),
    },
  }
})

describe('getMedication', () => {
  it('returns a medication by slug', async () => {
    const { getMedication } = await import('@/lib/medications')
    const med = await getMedication('lisinopril')
    expect(med).toBeDefined()
    expect(med?.slug).toBe('lisinopril')
  })
})

describe('getPopularMedications', () => {
  it('returns an array of medications', async () => {
    const { getPopularMedications } = await import('@/lib/medications')
    const meds = await getPopularMedications(12)
    expect(Array.isArray(meds)).toBe(true)
    expect(meds.length).toBeGreaterThan(0)
  })
})

describe('getMedicationByBrandSlug', () => {
  it('returns the medication whose brand_names contains the given slug', async () => {
    const { getMedicationByBrandSlug } = await import('@/lib/medications')
    // 'zestril' is in brand_names for the mocked lisinopril medication
    const med = await getMedicationByBrandSlug('zestril')
    expect(med).toBeDefined()
    expect(med?.slug).toBe('lisinopril')
  })

  it('returns null when no medication has that brand name', async () => {
    const { getMedicationByBrandSlug } = await import('@/lib/medications')
    const med = await getMedicationByBrandSlug('notabrand')
    expect(med).toBeNull()
  })
})
