import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TenantPublicData, TenantConfig, TenantCategory } from '@/types/tenant'
import { detectSlug } from '@/utils/detectSlug'

/**
 * L'en-tête de commune, ou rien.
 *
 * Omis plutôt qu'inventé quand l'adresse n'en désigne aucune : les pages
 * publiques n'appartiennent à aucune commune.
 */
function tenantHeader(): Record<string, string> {
  const slug = detectSlug()
  return slug ? { 'X-Tenant-Slug': slug } : {}
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/** Repli quand une commune n'a pas de coordonnées — un prospect, typiquement. */
const FRANCE_CENTER = { lat: 46.6, lng: 2.5 }

export const useTenantStore = defineStore('tenant', () => {
  const data = ref<TenantPublicData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * La taxonomie complète, inactives comprises. `null` tant que personne ne l'a
   * demandée.
   *
   * `GET /api/tenant/config` ne rend que les catégories actives — c'est ce dont
   * l'application de l'habitant a besoin, et lui envoyer des catégories qu'elle
   * ne doit pas proposer serait une erreur. Mais le back-office, lui, affiche
   * des signalements *déjà déposés* : un signalement classé dans une catégorie
   * depuis désactivée gardait son slug brut à l'écran (« vegetation » au lieu
   * d'« Espaces verts »), faute de trouver son libellé.
   */
  const allCategories = ref<TenantCategory[] | null>(null)

  // ─── Getters ──────────────────────────────────────────
  const slug = computed(() => data.value?.slug ?? '')
  const name = computed(() => data.value?.name ?? 'OnSignale')
  const config = computed(() => data.value?.config ?? null)
  /**
   * L'identifiant de la commune.
   *
   * Exposé parce que le temps réel en a besoin : un abonnement `postgres_changes`
   * se filtre sur une colonne, donc sur `tenant_id`, pas sur un slug.
   */
  const tenantId = computed(() => data.value?.config?.tenant_id ?? null)
  /** Complète si elle a été chargée, active seule sinon. */
  const categories = computed(() => allCategories.value ?? data.value?.categories ?? [])
  const activeCategories = computed(() => categories.value.filter((c) => c.is_active))
  /**
   * Le cadrage des cartes du back-office.
   *
   * Le repli était les coordonnées de la mairie de Dreux — un héritage de
   * l'époque où la plateforme n'avait qu'une commune. Pour n'importe quelle
   * autre, une carte centrée sur Dreux est une carte fausse, pas une carte par
   * défaut. Le centre de la France, lui, ne prétend rien.
   */
  const mapCenter = computed(() => ({
    lat: config.value?.map_lat ?? FRANCE_CENTER.lat,
    lng: config.value?.map_lng ?? FRANCE_CENTER.lng,
    zoom: config.value?.map_zoom ?? (config.value?.map_lat ? 13 : 5),
  }))
  const features = computed(() => ({
    votes: config.value?.feature_votes ?? true,
    aiAnalysis: config.value?.feature_ai_analysis ?? true,
    weeklyReport: config.value?.feature_weekly_report ?? true,
    heatmap: config.value?.feature_heatmap ?? true,
  }))

  // ─── Charger la config ─────────────────────────────────
  const load = async (): Promise<void> => {
    loading.value = true
    error.value = null

    const tenantSlug = detectSlug()
    const MAX_ATTEMPTS = 3
    const RETRY_DELAY_MS = 800

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/tenant/config`, {
          headers: tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {},
        })

        if (response.status === 404) {
          // Tenant inexistant — inutile de réessayer
          error.value = 'Tenant introuvable'
          break
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        data.value = result
        applyTheme(result.config?.primary_color ?? '#1A56A0')
        error.value = null
        break
      } catch (err: any) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt))
        } else {
          error.value = 'Impossible de charger la configuration. Vérifiez votre connexion.'
        }
      }
    }

    loading.value = false
  }

  /**
   * Charge la taxonomie complète. À n'appeler que depuis le back-office.
   *
   * L'échec est silencieux et sans conséquence : `categories` retombe sur la
   * liste active, qui est ce qu'on avait avant.
   */
  const loadAllCategories = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/tenant/categories`, {
        headers: tenantHeader(),
      })
      if (!response.ok) return
      allCategories.value = await response.json()
    } catch {
      // Silencieux : voir ci-dessus.
    }
  }

  // ─── Appliquer le thème CSS ────────────────────────────
  function applyTheme(color: string) {
    document.documentElement.style.setProperty('--color-primary', color)
    document.documentElement.style.setProperty('--color-primary-dark', darkenColor(color, 10))
  }

  function darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max((num >> 16) - amt, 0)
    const G = Math.max(((num >> 8) & 0x00ff) - amt, 0)
    const B = Math.max((num & 0x0000ff) - amt, 0)
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  }

  // ─── Mettre à jour la config ───────────────────────────
  async function updateConfig(
    updates: Partial<TenantConfig>,
    token: string
  ): Promise<void> {
    const response = await fetch(`${API_URL}/api/tenant/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': slug.value,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error ?? 'Erreur mise à jour config')
    }

    const result = await response.json()
    if (data.value) {
      data.value.config = { ...data.value.config, ...result }
      if (updates.primary_color) {
        applyTheme(updates.primary_color)
      }
    }
  }

  return {
    data, loading, error,
    slug, name, config, tenantId,
    categories, activeCategories,
    mapCenter, features,
    load, loadAllCategories, updateConfig,
  }
})

