import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type ReportRealtimePayload = RealtimePostgresChangesPayload<{
  id: string
  title: string
  category: string
  status: 'en_attente' | 'pris_en_charge' | 'resolu'
  lat: number
  lng: number
  address_approx: string | null
  photo_url: string | null
  vote_count: number
  ai_assisted: boolean
  is_anonymous: boolean
  user_id: string | null
  created_at: string
  updated_at: string
}>

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'

export interface RealtimeNotification {
  id: string
  type: 'new_report' | 'status_change' | 'new_vote'
  message: string
  reportId: string
  reportTitle: string
  timestamp: Date
  read: boolean
}
