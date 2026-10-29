/**
 * Une catégorie, telle que le serveur la résout pour cette commune.
 *
 * Depuis la migration 026 le `slug` est **national** : c'est lui que porte
 * `reports.category`, lui que l'IA produit, et lui qui rend comparables deux
 * signalements de deux communes. La mairie règle ce qui relève de son
 * organisation — le libellé, le service, le délai, l'activation — jamais ce qui
 * existe. Il n'y a donc plus d'identifiant de ligne à manipuler côté client :
 * le slug suffit à désigner la catégorie.
 */
export interface TenantCategory {
  slug: string
  label: string
  icon: string
  color: string | null
  /** Le texte national, lu tel quel par l'IA. Affiché en aide dans l'admin. */
  description: string
  is_active: boolean
  sort_order: number
  sla_hours: number
  service_name?: string | null
  service_emails?: string[]
  /** `true` tant que la commune n'a rien décidé pour cette catégorie. */
  is_default?: boolean
}

export interface TenantConfig {
  /** L'identifiant de la commune — la clé de tout cloisonnement. */
  tenant_id: string
  city_name: string
  primary_color: string
  /**
   * Le cadrage des cartes du back-office. `null` pour une commune prospect,
   * que personne n'a paramétrée.
   */
  map_lat: number | null
  map_lng: number | null
  map_zoom: number | null
  feature_votes: boolean
  feature_ai_analysis: boolean
  feature_weekly_report: boolean
  feature_heatmap: boolean
  /** Quand le rapport hebdomadaire part, jour ISO (1 = lundi) et heure locale. */
  weekly_report_day: number
  weekly_report_hour: number
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
