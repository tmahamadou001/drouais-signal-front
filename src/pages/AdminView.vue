<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Report, AdminStats, ReportStatus, ReportCategory } from '@/types'
import { STATUS_CONFIG, CATEGORY_CONFIG } from '@/types'
import StatusBadge from '@/components/StatusBadge.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import StatusTimeline from '@/components/StatusTimeline.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { apiFetch } = useApi()

const reports = ref<Report[]>([])
const stats = ref<AdminStats>({ total: 0, en_attente: 0, pris_en_charge: 0, resolu: 0 })
const loading = ref(true)
const filterStatus = ref<ReportStatus | ''>('')
const filterCategory = ref<ReportCategory | ''>()
const sortBy = ref<'recent' | 'votes' | 'oldest'>('recent')
const currentPage = ref(1)
const totalPages = ref(1)
const totalReports = ref(0)

// Slide-over
const selectedReport = ref<Report | null>(null)
const slideOverOpen = ref(false)
const actionLoading = ref(false)

const statCards = computed(() => [
  { label: 'Total', value: stats.value.total, icon: '📊', bg: 'bg-primary-50', text: 'text-primary' },
  { label: 'En attente', value: stats.value.en_attente, icon: '🕐', bg: 'bg-neutral-100', text: 'text-neutral-700' },
  { label: 'Pris en charge', value: stats.value.pris_en_charge, icon: '🔧', bg: 'bg-warning-50', text: 'text-warning-600' },
  { label: 'Résolus', value: stats.value.resolu, icon: '✅', bg: 'bg-success-50', text: 'text-success-600' },
])

const filteredReports = computed(() => {
  let filtered = reports.value.filter(r => {
    if (filterStatus.value && r.status !== filterStatus.value) return false
    if (filterCategory.value && r.category !== filterCategory.value) return false
    return true
  })

  if (sortBy.value === 'votes') {
    filtered = [...filtered].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
  } else if (sortBy.value === 'oldest') {
    filtered = [...filtered].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  } else {
    filtered = [...filtered].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  return filtered
})

async function fetchData() {
  loading.value = true
  try {
    const [reportsResponse, statsData] = await Promise.all([
      apiFetch<{ data: Report[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/api/reports?page=${currentPage.value}&limit=20`
      ),
      apiFetch<AdminStats>('/api/admin/stats'),
    ])
    reports.value = reportsResponse.data
    totalPages.value = reportsResponse.pagination.totalPages
    totalReports.value = reportsResponse.pagination.total
    stats.value = statsData
  } catch (err) {
    console.error('Erreur admin:', err)
  } finally {
    loading.value = false
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchData()
  }
}

function getPageNumbers(): number[] {
  const pages: number[] = []
  const maxVisible = 5
  
  if (totalPages.value <= maxVisible) {
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    if (currentPage.value <= 3) {
      for (let i = 1; i <= 5; i++) pages.push(i)
    } else if (currentPage.value >= totalPages.value - 2) {
      for (let i = totalPages.value - 4; i <= totalPages.value; i++) pages.push(i)
    } else {
      for (let i = currentPage.value - 2; i <= currentPage.value + 2; i++) pages.push(i)
    }
  }
  
  return pages
}

function openSlideOver(report: Report) {
  selectedReport.value = report
  slideOverOpen.value = true
}

function closeSlideOver() {
  slideOverOpen.value = false
  setTimeout(() => { selectedReport.value = null }, 300)
}

async function updateStatus(reportId: string, newStatus: ReportStatus) {
  actionLoading.value = true
  try {
    await apiFetch(`/api/reports/${reportId}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    await fetchData()

    // Update slide-over if open
    if (selectedReport.value?.id === reportId) {
      selectedReport.value = reports.value.find(r => r.id === reportId) || null
    }
  } catch (err) {
    console.error('Erreur mise à jour:', err)
  } finally {
    actionLoading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10">
    <div class="mb-8">
      <h1 class="text-2xl font-display font-bold text-dark">Administration</h1>
      <p class="text-sm text-neutral-500 mt-1">Gestion des signalements urbains</p>
    </div>

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="stat in statCards"
          :key="stat.label"
          class="rounded-ds-lg p-5"
          :class="stat.bg"
        >
          <div class="flex items-center justify-between">
            <span class="text-2xl">{{ stat.icon }}</span>
            <span class="text-2xl font-bold" :class="stat.text">{{ stat.value }}</span>
          </div>
          <p class="text-xs font-medium text-neutral-600 mt-2">{{ stat.label }}</p>
        </div>
      </div>

      <!-- Filters and Sort -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <select
          v-model="filterStatus"
          class="px-3 py-2 rounded-ds border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          <option v-for="(config, key) in STATUS_CONFIG" :key="key" :value="key">
            {{ config.label }}
          </option>
        </select>
        <select
          v-model="filterCategory"
          class="px-3 py-2 rounded-ds border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">Toutes les catégories</option>
          <option v-for="(config, key) in CATEGORY_CONFIG" :key="key" :value="key">
            {{ config.emoji }} {{ config.label }}
          </option>
        </select>
        
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-xs text-neutral-500 font-medium">Tri :</span>
          <button
            @click="sortBy = 'recent'"
            :class="[
              'px-3 py-1.5 rounded-ds text-xs font-medium transition-colors',
              sortBy === 'recent' 
                ? 'bg-primary text-white' 
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            ]"
          >
            Plus récents
          </button>
          <button
            @click="sortBy = 'votes'"
            :class="[
              'px-3 py-1.5 rounded-ds text-xs font-medium transition-colors',
              sortBy === 'votes' 
                ? 'bg-primary text-white' 
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            ]"
          >
            Plus votés
          </button>
          <button
            @click="sortBy = 'oldest'"
            :class="[
              'px-3 py-1.5 rounded-ds text-xs font-medium transition-colors',
              sortBy === 'oldest' 
                ? 'bg-primary text-white' 
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            ]"
          >
            En retard
          </button>
        </div>
        
        <span class="text-sm text-neutral-500 w-full sm:w-auto">
          {{ filteredReports.length }} signalement{{ filteredReports.length > 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-ds-xl border border-neutral-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-neutral-50 border-b border-neutral-200">
                <th class="text-left px-4 py-3 font-semibold text-neutral-600">Signalement</th>
                <th class="text-left px-4 py-3 font-semibold text-neutral-600 hidden sm:table-cell">Catégorie</th>
                <th class="text-left px-4 py-3 font-semibold text-neutral-600">Statut</th>
                <th class="text-center px-4 py-3 font-semibold text-neutral-600 hidden lg:table-cell">Votes</th>
                <th class="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Date</th>
                <th class="text-right px-4 py-3 font-semibold text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="report in filteredReports"
                :key="report.id"
                class="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
                @click="openSlideOver(report)"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <CategoryIcon :category="report.category" size="sm" />
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <p class="font-medium text-dark truncate max-w-[200px]">{{ report.title }}</p>
                        <span
                          v-if="report.ai_assisted"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex-shrink-0"
                          title="Signalement créé avec l'aide de l'IA"
                        >
                          ✨ IA
                        </span>
                      </div>
                      <p class="text-xs text-neutral-400 truncate max-w-[200px]">{{ report.address_approx || '—' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 hidden sm:table-cell text-neutral-600">
                  {{ CATEGORY_CONFIG[report.category].label }}
                </td>
                <td class="px-4 py-3">
                  <StatusBadge :status="report.status" />
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  <div class="flex items-center justify-center gap-2">
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      <span>▲</span>
                      <span>{{ report.vote_count || 0 }}</span>
                    </div>
                    <span
                      v-if="(report.vote_count || 0) >= 5"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold"
                    >
                      🔥 Populaire
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 hidden md:table-cell text-neutral-500">
                  {{ formatDate(report.created_at) }}
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-2">
                    <button
                      v-if="report.status === 'en_attente'"
                      @click="updateStatus(report.id, 'pris_en_charge')"
                      :disabled="actionLoading"
                      class="px-3 py-1.5 rounded-ds text-xs font-medium bg-warning-50 text-warning-700 hover:bg-warning-100 transition-colors disabled:opacity-50"
                    >
                      Prendre en charge
                    </button>
                    <button
                      v-if="report.status === 'pris_en_charge'"
                      @click="updateStatus(report.id, 'resolu')"
                      :disabled="actionLoading"
                      class="px-3 py-1.5 rounded-ds text-xs font-medium bg-success-50 text-success-700 hover:bg-success-100 transition-colors disabled:opacity-50"
                    >
                      Marquer résolu
                    </button>
                    <span
                      v-if="report.status === 'resolu'"
                      class="text-xs text-neutral-400"
                    >
                      Terminé
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
          <div class="text-sm text-neutral-500">
            Page {{ currentPage }} sur {{ totalPages }} — {{ totalReports }} signalement{{ totalReports > 1 ? 's' : '' }} au total
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="px-3 py-1.5 rounded-ds text-sm font-medium bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Précédent
            </button>
            
            <div class="flex items-center gap-1">
              <button
                v-for="page in getPageNumbers()"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'px-3 py-1.5 rounded-ds text-sm font-medium transition-colors',
                  page === currentPage
                    ? 'bg-primary text-white'
                    : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                ]"
              >
                {{ page }}
              </button>
            </div>

            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="px-3 py-1.5 rounded-ds text-sm font-medium bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Slide-over -->
    <Teleport to="body">
      <Transition name="slideover">
        <div v-if="slideOverOpen && selectedReport" class="fixed inset-0 z-50">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-dark/30" @click="closeSlideOver" />

          <!-- Panel -->
          <div class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 class="font-semibold text-dark">Détail du signalement</h2>
              <button
                @click="closeSlideOver"
                class="w-8 h-8 rounded-ds flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6">
              <!-- Photo -->
              <img
                v-if="selectedReport.photo_url"
                :src="selectedReport.photo_url"
                class="w-full h-48 object-cover rounded-ds-lg"
                :alt="selectedReport.title"
              />

              <!-- Info -->
              <div>
                <div class="flex items-start gap-3">
                  <CategoryIcon :category="selectedReport.category" size="lg" />
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="font-bold text-dark">{{ selectedReport.title }}</h3>
                      <span
                        v-if="selectedReport.ai_assisted"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold"
                        title="Signalement créé avec l'aide de l'IA"
                      >
                        ✨ IA
                      </span>
                    </div>
                    <p class="text-sm text-neutral-500 mt-0.5">
                      {{ CATEGORY_CONFIG[selectedReport.category].label }}
                    </p>
                    <p v-if="selectedReport.address_approx" class="text-sm text-neutral-500">
                      {{ selectedReport.address_approx }}
                    </p>
                  </div>
                </div>

                <div v-if="(selectedReport.vote_count || 0) > 0" class="mt-4 flex items-center gap-2">
                  <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
                    <span>▲</span>
                    <span>{{ selectedReport.vote_count }} citoyen{{ selectedReport.vote_count > 1 ? 's ont' : ' a' }} signalé ce problème</span>
                  </div>
                  <span
                    v-if="selectedReport.vote_count >= 5"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold"
                  >
                    🔥 Populaire
                  </span>
                </div>

                <p v-if="selectedReport.description" class="text-sm text-neutral-600 mt-4 leading-relaxed">
                  {{ selectedReport.description }}
                </p>
              </div>

              <!-- Timeline -->
              <div>
                <h4 class="text-sm font-semibold text-dark mb-3">Suivi</h4>
                <StatusTimeline :current-status="selectedReport.status" />
              </div>

              <!-- Actions -->
              <div class="border-t border-neutral-200 pt-4 space-y-3">
                <button
                  v-if="selectedReport.status === 'en_attente'"
                  @click="updateStatus(selectedReport.id, 'pris_en_charge')"
                  :disabled="actionLoading"
                  class="w-full py-2.5 rounded-ds bg-warning text-white font-semibold text-sm hover:bg-warning-500 transition-colors disabled:opacity-50"
                >
                  Prendre en charge
                </button>
                <button
                  v-if="selectedReport.status === 'pris_en_charge'"
                  @click="updateStatus(selectedReport.id, 'resolu')"
                  :disabled="actionLoading"
                  class="w-full py-2.5 rounded-ds bg-success text-white font-semibold text-sm hover:bg-success-500 transition-colors disabled:opacity-50"
                >
                  Marquer résolu
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.slideover-enter-active,
.slideover-leave-active {
  transition: all 0.3s ease;
}
.slideover-enter-active > div:last-child,
.slideover-leave-active > div:last-child {
  transition: transform 0.3s ease;
}
.slideover-enter-from,
.slideover-leave-to {
  opacity: 0;
}
.slideover-enter-from > div:last-child,
.slideover-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
