export interface TenantCategory {
  id: string
  slug: string
  label: string
  icon: string
  color: string
  description?: string
  is_active: boolean
  sort_order: number
  sla_hours: number
}

export interface TenantConfig {
  city_name: string
  city_population?: number
  department_code?: string
  region?: string
  primary_color: string
  logo_url?: string
  welcome_message?: string
  map_lat: number
  map_lng: number
  map_zoom: number
  feature_anonymous_reports: boolean
  feature_votes: boolean
  feature_ai_analysis: boolean
  feature_weekly_report: boolean
  feature_heatmap: boolean
  weekly_report_day: number
  weekly_report_hour: number
  weekly_report_emails: string[]
}

export interface TenantPublicData {
  slug: string
  name: string
  status: string
  plan: string
  config: TenantConfig
  categories: TenantCategory[]
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: 'admin' | 'agent' | 'observer'
  is_active: boolean
  first_name?: string
  last_name?: string
  job_title?: string
  joined_at: string
  email?: string
}
