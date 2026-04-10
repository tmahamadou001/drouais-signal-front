<script setup lang="ts">
import { ref, onMounted, computed, provide } from 'vue'
import { RouterLink } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useTenantStore } from '@/stores/tenant'
import { useTenantCategories } from '@/composables/useTenantCategories'
import type { AdminStats } from '@/types'
import MapView from '@/components/MapView.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import MapSkeleton from '@/components/MapSkeleton.vue'
import InstallButton from '@/components/InstallButton.vue'

const { apiFetch } = useApi()
const tenantStore = useTenantStore()
const { categories } = useTenantCategories()

const categoryDescription = computed(() =>
  categories.value.slice(0, 3).map((c) => c.label.toLowerCase()).join(', ') + '…'
)

const stats = ref<AdminStats>({ total: 0, en_attente: 0, pris_en_charge: 0, resolu: 0 })
const loading = ref(true)
const markersPromise = ref<Promise<any> | null>(null)

onMounted(async () => {
  try {
    const [statsData, markersData] = await Promise.all([
      apiFetch<AdminStats>('/api/admin/stats', {
        cache: { maxAge: 10_000 }
      }),
      apiFetch<{ markers: any[] }>('/api/map/markers', {
        cache: { maxAge: 10_000 }
      })
    ])
    
    stats.value = statsData
    
    markersPromise.value = Promise.resolve(markersData)
  } catch (err) {
    console.error('Erreur chargement:', err)
  } finally {
    loading.value = false
  }
})

provide('preloadedMarkers', markersPromise)

const statCards = computed(() => [
  { label: 'Signalements', value: stats.value.total, color: 'bg-primary', textColor: 'text-primary' },
  { label: 'En attente', value: stats.value.en_attente, color: 'bg-neutral-400', textColor: 'text-neutral-600' },
  { label: 'Pris en charge', value: stats.value.pris_en_charge, color: 'bg-warning', textColor: 'text-warning-600' },
  { label: 'Résolus', value: stats.value.resolu, color: 'bg-success', textColor: 'text-success-600' },
])
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary to-primary-400">
      <!-- Decorative pattern -->
      <div class="absolute inset-0 opacity-[0.07]" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;1&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>

      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
            <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
            <span class="text-white/90 text-sm font-medium">Service actif — {{ tenantStore.name }}</span>
          </div>

          <h1 class="text-3xl sm:text-5xl font-display font-bold text-white leading-tight mb-4">
            Signalez un problème urbain à
            <span class="text-warning-300">{{ tenantStore.config?.city_name ?? tenantStore.name }}</span>
            en 3 clics
          </h1>

          <p class="text-lg text-white/80 mb-8 max-w-lg">
            {{ categoryDescription }}
            Photographiez, localisez, envoyez. Les services techniques s'en occupent.
          </p>

          <div class="flex flex-col sm:flex-row gap-3">
            <RouterLink
              to="/signaler"
              class="inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-ds-lg hover:bg-neutral-50 transition-colors shadow-ds-lg"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Faire un signalement
            </RouterLink>
            <a
              href="#carte"
              class="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-medium px-6 py-3 rounded-ds-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Voir la carte
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>

          <div class="mt-6">
            <InstallButton />
          </div>
        </div>
      </div>
    </section>

    <!-- Stats bar -->
    <section class="bg-white border-b border-neutral-200">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Skeleton pendant le chargement -->
          <template v-if="loading">
            <SkeletonCard v-for="i in 4" :key="i" />
          </template>
          
          <!-- Stats réelles -->
          <template v-else>
            <div
              v-for="stat in statCards"
              :key="stat.label"
              class="flex items-center gap-3 px-4 py-3 rounded-ds-lg bg-neutral-50"
            >
              <div class="w-2 h-8 rounded-full" :class="stat.color"></div>
              <div>
                <p class="text-2xl font-bold" :class="stat.textColor">{{ stat.value }}</p>
                <p class="text-xs text-neutral-500 font-medium">{{ stat.label }}</p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Map -->
    <section id="carte" class="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-display font-bold text-dark">Carte des signalements</h2>
          <p class="text-sm text-neutral-500 mt-1">Tous les signalements publics sur {{ tenantStore.config?.city_name ?? tenantStore.name }} et ses alentours</p>
        </div>
        <div class="hidden sm:flex items-center gap-4 text-xs text-neutral-500">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-neutral-400"></span> En attente
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-warning"></span> Pris en charge
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-success"></span> Résolu
          </span>
        </div>
      </div>

      <MapSkeleton v-if="loading" />
      <div v-else class="h-[500px] rounded-ds-lg overflow-hidden shadow-ds-lg border border-neutral-200">
        <MapView :show-all-markers="true" />
      </div>
    </section>
  </div>
</template>
