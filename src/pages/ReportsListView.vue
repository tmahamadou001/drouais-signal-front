<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useReportStatuses } from '@/composables/useReportStatuses'
import type { Report } from '@/types'
import ReportCard from '@/components/ReportCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const { apiFetch } = useApi()
const { categories, getCategoryIcon, getCategoryLabel } = useTenantCategories()

const reports = ref<Report[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const total = ref(0)
const totalPages = ref(1)

const statusFilter = ref<string>((route.query.status as string) || 'all')
const categoryFilter = ref<string>((route.query.category as string) || 'all')
const page = ref(parseInt(route.query.page as string) || 1)

const statuses = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'pris_en_charge', label: 'Pris en charge' },
  { value: 'resolu', label: 'Résolus' },
]

async function fetchReports() {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({ page: page.value.toString(), limit: '20' })
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (categoryFilter.value !== 'all') params.set('category', categoryFilter.value)

    const data = await apiFetch<{ data: Report[]; pagination: any }>(`/api/reports?${params}`)
    reports.value = data.data
    total.value = data.pagination.total
    totalPages.value = data.pagination.totalPages
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function updateFilters() {
  page.value = 1
  const query: Record<string, string> = {}
  if (statusFilter.value !== 'all') query.status = statusFilter.value
  if (categoryFilter.value !== 'all') query.category = categoryFilter.value
  router.replace({ query })
  fetchReports()
}

function goToPage(p: number) {
  page.value = p
  const query: Record<string, string> = { page: p.toString() }
  if (statusFilter.value !== 'all') query.status = statusFilter.value
  if (categoryFilter.value !== 'all') query.category = categoryFilter.value
  router.replace({ query })
  fetchReports()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(fetchReports)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-display font-bold text-dark">Signalements</h1>
      <p v-if="!loading" class="text-sm text-neutral-500 mt-1">
        {{ total }} signalement{{ total > 1 ? 's' : '' }}
        <template v-if="statusFilter !== 'all'"> · {{ statuses.find(s => s.value === statusFilter)?.label }}</template>
        <template v-if="categoryFilter !== 'all'"> · {{ getCategoryLabel(categoryFilter) }}</template>
      </p>
    </div>

    <!-- Filtres -->
    <div class="flex flex-wrap gap-2 mb-6">
      <!-- Statut -->
      <div class="flex gap-1 p-1 bg-neutral-100 rounded-ds-lg">
        <button
          v-for="s in statuses"
          :key="s.value"
          @click="statusFilter = s.value; updateFilters()"
          class="px-3 py-1.5 rounded-ds text-sm font-medium transition-all"
          :class="statusFilter === s.value
            ? 'bg-white shadow-sm text-dark'
            : 'text-neutral-500 hover:text-dark'"
        >
          {{ s.label }}
        </button>
      </div>

      <!-- Catégorie -->
      <select
        v-model="categoryFilter"
        @change="updateFilters()"
        class="px-3 py-1.5 bg-neutral-100 rounded-ds-lg text-sm font-medium text-neutral-700 border-0 outline-none cursor-pointer hover:bg-neutral-200 transition-colors"
      >
        <option value="all">Toutes les catégories</option>
        <option v-for="cat in categories" :key="cat.slug" :value="cat.slug">
          {{ getCategoryIcon(cat.slug) }} {{ getCategoryLabel(cat.slug) }}
        </option>
      </select>
    </div>

    <!-- Liste -->
    <LoadingSpinner v-if="loading" />

    <p v-else-if="error" class="text-sm text-red-600 bg-red-50 rounded-ds px-4 py-3">
      {{ error }}
    </p>

    <div v-else-if="reports.length === 0" class="text-center py-16">
      <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-neutral-500 font-medium">Aucun signalement pour ces filtres</p>
      <button
        v-if="statusFilter !== 'all' || categoryFilter !== 'all'"
        @click="statusFilter = 'all'; categoryFilter = 'all'; updateFilters()"
        class="mt-3 text-sm text-primary hover:underline"
      >
        Réinitialiser les filtres
      </button>
    </div>

    <div v-else class="space-y-3">
      <ReportCard v-for="report in reports" :key="report.id" :report="report" />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-8">
      <button
        :disabled="page <= 1"
        @click="goToPage(page - 1)"
        class="px-4 py-2 rounded-ds border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Précédent
      </button>
      <span class="text-sm text-neutral-500">Page {{ page }} / {{ totalPages }}</span>
      <button
        :disabled="page >= totalPages"
        @click="goToPage(page + 1)"
        class="px-4 py-2 rounded-ds border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Suivant →
      </button>
    </div>
  </div>
</template>
