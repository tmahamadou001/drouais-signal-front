// Report categories — dynamic per tenant, typed as string
export type ReportCategory = string

// Report statuses
export type ReportStatus = 'en_attente' | 'pris_en_charge' | 'resolu'

// Main report type — matches the "reports" table
export interface Report {
  id: string
  title: string
  category: ReportCategory
  description: string | null
  photo_url: string | null
  lat: number
  lng: number
  address_approx: string | null
  status: ReportStatus
  user_id: string
  vote_count: number
  ai_assisted: boolean
  created_at: string
  updated_at: string
}

// Status history entry — matches the "status_history" table
export interface StatusHistoryEntry {
  id: string
  report_id: string
  old_status: ReportStatus
  new_status: ReportStatus
  agent_id: string | null
  changed_at: string
  comment: string | null
}

// Payload to create a new report (from the form)
export interface CreateReportPayload {
  title: string
  category: ReportCategory
  description?: string
  lat: number
  lng: number
  address_approx?: string
  // photo is sent as FormData, not in JSON
}

// Payload to update a report status (admin action)
export interface UpdateStatusPayload {
  status: ReportStatus
  comment?: string
}

// Admin dashboard stats
export interface AdminStats {
  total: number
  en_attente: number
  pris_en_charge: number
  resolu: number
}

