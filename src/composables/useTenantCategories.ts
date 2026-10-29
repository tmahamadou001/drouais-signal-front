import { computed } from 'vue'
import { useTenantStore } from '@/stores/tenant'

/** Le défaut de `tenant_categories.sla_hours` — une semaine. */
const DEFAULT_SLA_HOURS = 168

export function useTenantCategories() {
  const tenantStore = useTenantStore()

  const categories = computed(() => tenantStore.activeCategories)

  /**
   * Cherché dans la liste **complète**, pas seulement l'active.
   *
   * Un signalement déjà déposé dans une catégorie depuis désactivée a encore
   * besoin de son libellé : c'est de l'histoire, pas une proposition de saisie.
   * Seules les listes de choix s'appuient sur `categories` ci-dessus, qui reste
   * l'active.
   */
  const getCategoryLabel = (slug: string): string => {
    return tenantStore.categories.find((c) => c.slug === slug)?.label ?? slug
  }

  const getCategoryColor = (slug: string): string => {
    return tenantStore.categories.find((c) => c.slug === slug)?.color ?? '#6B7280'
  }

  /**
   * Le libellé, pour une notification ou un titre de repli.
   *
   * Il n'y a plus d'emoji ici. L'icône d'une catégorie vient de
   * `lib/categories.ts` et se rend avec `AppIcon` ou `CategoryGlyph` ; celle
   * stockée en base variait d'une commune à l'autre pour la même catégorie
   * nationale.
   */
  const getCategoryDisplay = (slug: string): string => getCategoryLabel(slug)

  /**
   * Le délai que la commune s'est fixé pour cette catégorie, en heures.
   *
   * Sert à dire si un signalement est « en retard ». Toutes les catégories n'ont
   * pas la même urgence — une fuite d'eau et un tag ne se traitent pas dans la
   * même semaine — et c'est très exactement ce que la mairie règle dans ses
   * paramètres. Un seuil unique effacerait ce réglage.
   */
  const getCategorySla = (slug: string): number => {
    return tenantStore.categories.find((c) => c.slug === slug)?.sla_hours ?? DEFAULT_SLA_HOURS
  }

  /** Même règle que `GET /api/admin/stats`, pour que les deux comptes concordent. */
  const isOverdue = (report: { category: string; status: string; created_at: string }): boolean => {
    if (report.status === 'resolu') return false
    return Date.parse(report.created_at) + getCategorySla(report.category) * 3600_000 < Date.now()
  }

  /**
   * Les destinataires configurés pour une catégorie.
   *
   * Vide quand la commune traite cette catégorie en interne — c'est le cas qui
   * décide de ce que montre la boîte de transmission.
   */
  const getServiceEmails = (slug: string): string[] =>
    tenantStore.categories.find((c) => c.slug === slug)?.service_emails ?? []

  return {
    categories,
    getServiceEmails,
    getCategoryLabel,
    getCategoryColor,
    getCategoryDisplay,
    getCategorySla,
    isOverdue,
  }
}
