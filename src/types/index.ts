// Report categories
export type ReportCategory = 'voirie' | 'eclairage' | 'dechets' | 'autre'

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

// Category display config (for UI rendering)
export interface CategoryConfig {
  label: string
  emoji: string
  color: string
}

// Map of all categories to their display config
export const CATEGORY_CONFIG: Record<ReportCategory, CategoryConfig> = {
  voirie: {
    label: 'Voirie',
    emoji: '🚧',
    color: '#EF4444',
  },
  eclairage: {
    label: 'Éclairage',
    emoji: '💡',
    color: '#F59E0B',
  },
  dechets: {
    label: 'Déchets',
    emoji: '🗑️',
    color: '#10B981',
  },
  autre: {
    label: 'Autre',
    emoji: '❓',
    color: '#6366F1',
  },
}

// Status display config (for badges, timelines)
export interface StatusConfig {
  label: string
  tailwindBg: string
  tailwindText: string
  dotColor: string
}

export const STATUS_CONFIG: Record<ReportStatus, StatusConfig> = {
  en_attente: {
    label: 'En attente',
    tailwindBg: 'bg-neutral-200',
    tailwindText: 'text-neutral-700',
    dotColor: '#A3A3A3',
  },
  pris_en_charge: {
    label: 'Pris en charge',
    tailwindBg: 'bg-warning-50',
    tailwindText: 'text-warning-700',
    dotColor: '#EF9F27',
  },
  resolu: {
    label: 'Résolu',
    tailwindBg: 'bg-success-50',
    tailwindText: 'text-success-700',
    dotColor: '#1D9E75',
  },
}
