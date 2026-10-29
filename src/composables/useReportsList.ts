import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useApi } from '@/composables/useApi'
import { PAGE_SIZE } from '@/composables/usePageSize'
import type { Report, ReportStatus } from '@/types'

/**
 * La liste des signalements du back-office : filtres, pagination, compteurs.
 *
 * Extrait de l'écran parce que c'est la moitié de son code et qu'aucune de ces
 * lignes ne parle d'affichage. L'écran garde ce qui lui appartient — ce qu'on
 * voit, et ce qui se passe quand on clique.
 *
 * **Les filtres partent au serveur.** Ils étaient appliqués sur la page reçue,
 * c'est-à-dire sur quinze lignes déjà là : « En attente » ne montrait pas les
 * signalements en attente de la commune mais ceux de la page courante, et le
 * total affiché à côté ne correspondait ni à l'un ni à l'autre.
 */

export interface AdminStats {
  total: number
  en_attente: number
  pris_en_charge: number
  resolu: number
  new_this_week: number
  resolved_this_month: number
  overdue: number
}

const EMPTY_STATS: AdminStats = {
  total: 0, en_attente: 0, pris_en_charge: 0, resolu: 0,
  new_this_week: 0, resolved_this_month: 0, overdue: 0,
}

export const PERIODS = [
  { days: 0,   label: 'Toute période' },
  { days: 30,  label: '30 j.' },
  { days: 90,  label: '90 j.' },
  { days: 365, label: '1 an' },
]

export const SORTS = [
  { value: 'recent' as const, label: 'Plus récents' },
  { value: 'oldest' as const, label: 'Plus anciens' },
  { value: 'votes' as const,  label: 'Plus constatés' },
]

export function useReportsList() {
  const { apiFetch, invalidateCachePattern } = useApi()

  const reports = ref<Report[]>([])
  const stats = ref<AdminStats>(EMPTY_STATS)
  const loading = ref(true)
  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalReports = ref(0)

  const search = ref('')
  const filterStatus = ref<ReportStatus | ''>('')
  const filterCategory = ref('')
  /**
   * La période, en jours. `0` = pas de borne, et c'est le défaut.
   *
   * Elle valait 90 jours : la page demandait quinze signalements au serveur et
   * en cachait silencieusement huit, plus anciens que l'horizon. Un écran qui
   * annonce « Tous » et n'en montre que la moitié est un écran qui ment.
   */
  const filterDays = ref(0)
  const onlyOverdue = ref(false)
  /**
   * D'où viennent les signalements listés : `''` (tous), `citizen`, `agent`.
   *
   * « Qu'est-ce qu'on a saisi nous-mêmes cette semaine ? » est une question de
   * réunion de service, et la réponse ne doit pas demander d'exporter un CSV.
   */
  const filterSource = ref<'' | 'citizen' | 'agent'>('')
  const sortBy = ref<'recent' | 'oldest' | 'votes'>('recent')

  /**
   * Ce qu'on demande, sans l'endroit où l'on en est.
   *
   * Séparé de la pagination pour une raison précise : c'est **lui** que
   * surveille le rechargement. La liste des filtres était recopiée dans un
   * `watch`, et tout filtre ajouté sans être ajouté aussi à cette seconde liste
   * partait dans l'URL sans jamais déclencher de requête — l'écran ne bougeait
   * pas, aucun appel réseau ne partait, et rien ne le signalait. Une seule
   * liste, donc, et le prochain filtre marchera par construction.
   */
  const filterKey = computed(() => {
    const params = new URLSearchParams({ sort: sortBy.value })

    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterCategory.value) params.set('category', filterCategory.value)
    if (search.value.trim()) params.set('search', search.value.trim())
    if (filterDays.value > 0) params.set('since', String(filterDays.value))
    if (onlyOverdue.value) params.set('overdue', 'true')
    if (filterSource.value) params.set('source', filterSource.value)

    return params.toString()
  })

  const listQuery = computed(
    () => `page=${currentPage.value}&limit=${PAGE_SIZE}&${filterKey.value}`
  )

  /** Y a-t-il quelque chose à réinitialiser ? */
  const hasFilters = computed(() =>
    Boolean(
      search.value.trim() || filterStatus.value || filterCategory.value ||
      filterDays.value > 0 || onlyOverdue.value || filterSource.value
    )
  )

  function resetFilters() {
    search.value = ''
    filterStatus.value = ''
    filterCategory.value = ''
    filterDays.value = 0
    onlyOverdue.value = false
    filterSource.value = ''
  }

  async function loadReports() {
    const response = await apiFetch<{
      data: Report[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/api/reports?${listQuery.value}`, { cache: { maxAge: 5_000 } })

    reports.value = response.data
    totalPages.value = response.pagination.totalPages
    totalReports.value = response.pagination.total
  }

  async function loadStats() {
    stats.value = await apiFetch<AdminStats>('/api/admin/stats', { cache: { maxAge: 5_000 } })
  }

  async function fetchData() {
    loading.value = true
    try {
      await loadReports()
    } catch (err) {
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Recharge la table **et** les compteurs.
   *
   * Les quatre compteurs portent sur la totalité des signalements de la
   * commune : ils ne dépendent ni de la page affichée ni des filtres. Les
   * redemander à chaque changement de page, c'était une requête sur deux pour
   * rien. Ils sont rafraîchis là où ils peuvent vraiment changer : au premier
   * affichage, et après une action qui déplace un signalement d'une colonne à
   * l'autre.
   */
  async function refreshAll() {
    await Promise.all([fetchData(), loadStats()])
  }

  /** Vide le cache de tout ce qu'une action sur un signalement fait bouger. */
  function invalidateAll() {
    invalidateCachePattern(/^\/api\/reports/)
    invalidateCachePattern(/^\/api\/admin\/stats/)
    invalidateCachePattern(/^\/api\/admin\/heatmap/)
    invalidateCachePattern(/^\/api\/map\/markers/)
  }

  /**
   * La recherche se tape lettre par lettre ; le reste se clique.
   *
   * Un délai unique pour les deux rendait les onglets de statut poisseux ;
   * aucun délai envoyait une requête par frappe.
   */
  let searchTimer: number | null = null

  function debouncedFetch() {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => void fetchData(), 250)
  }

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  /**
   * Tout changement de filtre renvoie à la première page.
   *
   * Rester page 3 d'un jeu de résultats qui vient de se réduire à deux pages
   * affiche une table vide, et laisse croire que le filtre ne trouve rien.
   */
  const onFilterChange = ref<(() => void) | null>(null)

  // La pagination est volontairement hors de `filterKey` : changer de page ne
  // doit pas renvoyer à la page 1.
  watch(filterKey, () => {
    currentPage.value = 1
    onFilterChange.value?.()
    debouncedFetch()
  })

  function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
    void fetchData()
  }

  return {
    reports, stats, loading,
    currentPage, totalPages, totalReports,
    search, filterStatus, filterCategory, filterDays, onlyOverdue, filterSource, sortBy,
    listQuery, filterKey, hasFilters, resetFilters,
    fetchData, loadStats, refreshAll, invalidateAll, goToPage,
    onFilterChange,
  }
}
