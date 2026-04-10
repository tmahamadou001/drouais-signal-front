import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TenantPublicData, TenantConfig } from '@/types/tenant'
import { detectSlug } from '@/utils/detectSlug'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const useTenantStore = defineStore('tenant', () => {
  const data = ref<TenantPublicData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── Getters ──────────────────────────────────────────
  const slug = computed(() => data.value?.slug ?? '')
  const name = computed(() => data.value?.name ?? 'OnSignale')
  const config = computed(() => data.value?.config ?? null)
  const categories = computed(() => data.value?.categories ?? [])
  const activeCategories = computed(() => categories.value.filter((c) => c.is_active))
  const primaryColor = computed(() => config.value?.primary_color ?? '#1A56A0')
  const mapCenter = computed(() => ({
    lat: config.value?.map_lat ?? 48.7322,
    lng: config.value?.map_lng ?? 1.3664,
    zoom: config.value?.map_zoom ?? 13,
  }))
  const features = computed(() => ({
    anonymousReports: config.value?.feature_anonymous_reports ?? true,
    votes: config.value?.feature_votes ?? true,
    aiAnalysis: config.value?.feature_ai_analysis ?? true,
    weeklyReport: config.value?.feature_weekly_report ?? true,
    heatmap: config.value?.feature_heatmap ?? true,
  }))

  // ─── Charger la config ─────────────────────────────────
  const load = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const tenantSlug = detectSlug()
      const response = await fetch(`${API_URL}/api/tenant/config`, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      })

      if (!response.ok) {
        throw new Error('Tenant introuvable')
      }

      const result = await response.json()
      data.value = result
      applyTheme(result.config?.primary_color ?? '#1A56A0')
    } catch (err: any) {
      error.value = err.message
      // Ne pas bloquer l'app si le tenant ne charge pas
    } finally {
      loading.value = false
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
    slug, name, config,
    categories, activeCategories,
    primaryColor, mapCenter, features,
    load, updateConfig,
  }
})

