import { ref, type Ref } from 'vue'
import { useApi } from '@/composables/useApi'

/** Ce qu'une direction veut savoir d'un coup d'œil. Voir `get_treatment_stats` (migration 053). */
export interface TreatmentIndicators {
  total: number
  open_count: number
  overdue_count: number
  unassigned_count: number
  resolved_count: number
  closed_without_repair: number
  awaiting_clarification: number
  reopened_count: number
  /** Médianes sur les seuls signalements d'habitants : la moyenne cache les cas extrêmes. */
  median_ack_hours: number | null
  median_resolve_hours: number | null
  p90_resolve_hours: number | null
  /** Part des prises en charge intervenues sous 48 h. */
  ack_within_48h_rate: number | null
}

export interface ServiceRow {
  service_id: string | null
  service_name: string
  service_color: string | null
  report_count: number
  open_count: number
  overdue_count: number
  /** Les résolus **chronométrés** : la base des moyennes, pas le nombre de résolus. */
  measured_count: number
  avg_resolve_hours: number | null
  median_resolve_hours: number | null
  sla_compliance_rate: number | null
}

export interface ServiceCategoryRow {
  service_id: string | null
  category: string
  category_label: string
  report_count: number
  open_count: number
  overdue_count: number
  measured_count: number
  avg_resolve_hours: number | null
  sla_compliance_rate: number | null
}

export interface TreatmentData {
  period_days: number
  indicators: TreatmentIndicators | null
  by_service: ServiceRow[]
  by_service_category: ServiceCategoryRow[]
}

/**
 * Les indicateurs de traitement, pour la période de la page Performance.
 *
 * Un échec n'abîme pas la page : les graphiques de performance restent lisibles, et
 * le panneau dit simplement qu'il n'a pas pu se charger.
 */
export function useTreatmentStats(period: Ref<string | number>) {
  const { apiFetch } = useApi()
  const data = ref<TreatmentData | null>(null)
  const loading = ref(true)
  const failed = ref(false)

  async function load() {
    loading.value = true
    failed.value = false
    try {
      data.value = await apiFetch<TreatmentData>(`/api/admin/treatment?days=${period.value}`)
    } catch {
      failed.value = true
      data.value = null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, failed, load }
}
