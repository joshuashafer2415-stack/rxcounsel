export type MedicationType = 'core' | 'interactions' | 'warnings' | 'tips'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'none'
export type ScriptStatus = 'draft' | 'approved'

export interface Medication {
  id: string
  slug: string
  generic_name: string
  brand_names: string[]
  drug_class: string | null
  published: boolean
  created_at: string
}

export interface Video {
  id: string
  medication_id: string
  type: MedicationType
  mux_asset_id: string | null
  mux_playback_id: string | null
  is_free: boolean
}

export interface Script {
  id: string
  medication_id: string
  type: MedicationType
  content: string | null
  fda_source_data: string | null
  status: ScriptStatus
  reviewed_by: string | null
  reviewed_at: string | null
}

export interface User {
  id: string
  email: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: SubscriptionStatus
  subscription_period_end: string | null
}
