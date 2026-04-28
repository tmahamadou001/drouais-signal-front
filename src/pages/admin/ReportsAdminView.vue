<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Report, AdminStats, ReportStatus, ReportCategory } from '@/types'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useReportStatuses } from '@/composables/useReportStatuses'
import StatusBadge from '@/components/StatusBadge.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useRealtimeDashboard } from '@/composables/useRealtimeDashboard'
import RealtimeStatusBadge from '@/components/admin/RealtimeStatusBadge.vue'
import RealtimeToast from '@/components/admin/RealtimeToast.vue'
import AppTable from '@/components/AppTable.vue'
import AppModal from '@/components/AppModal.vue'
import AppButton from '@/components/AppButton.vue'
import type { ButtonAction } from '@/components/AppButton.vue'
import ReportDetailSidebar from '@/components/admin/ReportDetailSidebar.vue'

const { apiFetch, invalidateCachePattern, invalidateCache } = useApi()
const { categories: tenantCategories, getCategoryLabel } = useTenantCategories()
const { STATUS_OPTIONS } = useReportStatuses()

const reports = ref<Report[]>([])
const stats = ref<AdminStats>({ total: 0, en_attente: 0, pris_en_charge: 0, resolu: 0 })
const loading = ref(true)
const filterStatus = ref<ReportStatus | ''>('')
const filterCategory = ref<ReportCategory | ''>()
const sortBy = ref<'recent' | 'votes' | 'oldest'>('recent')
const currentPage = ref(1)
const totalPages = ref(1)
const totalReports = ref(0)

const selectedReport = ref<Report | null>(null)
const slideOverOpen = ref(false)
const actionLoading = ref(false)

const tableRef = ref<{ clearSelection: () => void; selectedIds: string[] } | null>(null)
const selectedReportIds = ref<string[]>([])
const deleteModalOpen = ref(false)
const deleteLoading = ref(false)
const reportToDelete = ref<Report | null>(null)
const bulkDeleteModalOpen = ref(false)

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

const tableColumns = computed(() => [
  { key: 'title', label: 'Signalement', align: 'left' as const },
  { key: 'category', label: 'Catégorie', align: 'left' as const, hidden: 'sm' as const },
  { key: 'status', label: 'Statut', align: 'left' as const },
  { key: 'vote_count', label: 'Votes', align: 'center' as const, hidden: 'lg' as const },
  { key: 'created_at', label: 'Date', align: 'left' as const, hidden: 'md' as const },
  { key: 'actions', label: 'Actions', align: 'right' as const },
])

const loadReports = async () => {
  try {
    const reportsResponse = await apiFetch<{ data: Report[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/api/reports?page=${currentPage.value}&limit=20`,
        {
          cache: { maxAge: 5_000 }
        }
      )
    reports.value = reportsResponse.data
    totalPages.value = reportsResponse.pagination.totalPages
    totalReports.value = reportsResponse.pagination.total
  } catch (e) {
    console.error(e)
  }
}

const loadStats = async () => {
  try {
    const statsData = await apiFetch('/api/admin/stats', {
      cache: { maxAge: 5_000 }
    })
    stats.value = statsData
  } catch (e) {
    console.error(e)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    await loadReports()
    await loadStats()
  } finally {
    loading.value = false
  }
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchData()
  }
}

const getPageNumbers = (): number[] => {
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

const openSlideOver = (report: Report) => {
  selectedReport.value = report
  slideOverOpen.value = true
}

const closeSlideOver = () => {
  slideOverOpen.value = false
  setTimeout(() => { selectedReport.value = null }, 300)
}

const updateStatus = async (reportId: string, newStatus: ReportStatus) => {
  actionLoading.value = true
  try {
    await apiFetch(`/api/reports/${reportId}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })

    invalidateCache(`/api/reports/${reportId}`)
    invalidateCachePattern(/^\/api\/map\/markers/)
    invalidateCachePattern(/^\/api\/reports/)
    invalidateCachePattern(/^\/api\/admin\/stats/)
    invalidateCachePattern(/^\/api\/admin\/heatmap/)

    await fetchData()

    if (selectedReport.value?.id === reportId) {
      selectedReport.value = reports.value.find(r => r.id === reportId) || null
    }
  } catch (err) {
    console.error('Erreur mise à jour:', err)
  } finally {
    actionLoading.value = false
  }
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const {
  connectionStatus,
  notifications,
  newReportIds,
  unreadCount,
  removeNotification,
} = useRealtimeDashboard({
  onNewReport: (newReport) => {
    reports.value.unshift(newReport as Report)
    stats.value.total++
    stats.value.en_attente++
  },

  onStatusChange: (reportId, newStatus, oldStatus) => {
    const report = reports.value.find((r) => r.id === reportId)
    if (report) {
      report.status = newStatus as ReportStatus
    }

    if (oldStatus === 'en_attente') stats.value.en_attente--
    else if (oldStatus === 'pris_en_charge') stats.value.pris_en_charge--
    else if (oldStatus === 'resolu') stats.value.resolu--

    if (newStatus === 'en_attente') stats.value.en_attente++
    else if (newStatus === 'pris_en_charge') stats.value.pris_en_charge++
    else if (newStatus === 'resolu') stats.value.resolu++
  },

  onVoteChange: (reportId, newCount) => {
    const report = reports.value.find((r) => r.id === reportId)
    if (report) {
      report.vote_count = newCount
    }
  },
})

function handleNotificationClick(reportId: string) {
  const element = document.getElementById(`report-${reportId}`)
  element?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

const handleSelectionChange = (ids: string[]) => {
  selectedReportIds.value = ids
}

const openDeleteModal = (report: Report) => {
  reportToDelete.value = report
  deleteModalOpen.value = true
}

const openBulkDeleteModal = () => {
  if (selectedReportIds.value.length === 0) return
  bulkDeleteModalOpen.value = true
}

const confirmDelete = async () => {
  if (!reportToDelete.value) return
  
  deleteLoading.value = true
  try {
    await apiFetch(`/api/reports/${reportToDelete.value.id}`, {
      method: 'DELETE',
    })

    invalidateCachePattern(/^\/api\/reports/)
    invalidateCachePattern(/^\/api\/admin\/stats/)
    invalidateCachePattern(/^\/api\/map\/markers/)
    invalidateCachePattern(/^\/api\/admin\/heatmap/)

    await fetchData()
    deleteModalOpen.value = false
    reportToDelete.value = null
  } catch (err: any) {
    console.error('Erreur suppression:', err)
    alert(err.message || 'Erreur lors de la suppression')
  } finally {
    deleteLoading.value = false
  }
}

const confirmBulkDelete = async () => {
  if (selectedReportIds.value.length === 0) return
  
  deleteLoading.value = true
  try {
    await apiFetch('/api/reports', {
      method: 'DELETE',
      body: { ids: selectedReportIds.value },
    })

    invalidateCachePattern(/^\/api\/reports/)
    invalidateCachePattern(/^\/api\/admin\/stats/)
    invalidateCachePattern(/^\/api\/map\/markers/)
    invalidateCachePattern(/^\/api\/admin\/heatmap/)

    await fetchData()
    tableRef.value?.clearSelection()
    selectedReportIds.value = []
    bulkDeleteModalOpen.value = false
  } catch (err: any) {
    console.error('Erreur suppression multiple:', err)
    alert(err.message || 'Erreur lors de la suppression')
  } finally {
    deleteLoading.value = false
  }
}

const getRowActions = (report: Report): ButtonAction[] => {

  const statusActions: ButtonAction[] = [
    {
      label: 'Supprimer',
      icon: 'Trash2',
      variant: 'danger',
      onClick: () => openDeleteModal(report),
    },
  ]

  if (report.status === 'en_attente') {
    statusActions.push({
      label: 'Prendre en charge',
      disabled: actionLoading.value,
      icon: 'Check',
      variant: 'warning',
      onClick: () => updateStatus(report.id, 'pris_en_charge'),
    })
  }

  if (report.status === 'pris_en_charge') {
    statusActions.push({
      label: 'Marquer résolu',
      icon: 'Check',
      variant: 'success',
      disabled: actionLoading.value,
      onClick: () => updateStatus(report.id, 'resolu'),
    })
  }

  
  return [
    ...statusActions,
  ]
}

onMounted(fetchData)
</script>

<template>
  <div class="p-4 md:p-6">
    <RealtimeToast
      :notifications="notifications"
      @dismiss="removeNotification"
      @click="handleNotificationClick"
    />

    <div class="mb-6 md:mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-xl md:text-2xl font-display font-bold text-dark">Signalements</h1>
        <p class="text-sm text-neutral-500 mt-1">Gestion des signalements urbains</p>
      </div>
      <RealtimeStatusBadge :status="connectionStatus" />
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
          <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
        <select
          v-model="filterCategory"
          class="px-3 py-2 rounded-ds border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">Toutes les catégories</option>
          <option v-for="cat in tenantCategories" :key="cat.slug" :value="cat.slug">
            {{ cat.icon }} {{ cat.label }}
          </option>
        </select>
        
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-xs text-neutral-500 font-medium">Tri :</span>
          <AppButton
            :variant="sortBy === 'recent' ? 'primary' : 'secondary'"
            size="xs"
            @click="sortBy = 'recent'"
          >
            Plus récents
          </AppButton>
          <AppButton
            :variant="sortBy === 'votes' ? 'primary' : 'secondary'"
            size="xs"
            @click="sortBy = 'votes'"
          >
            Plus votés
          </AppButton>
          <AppButton
            :variant="sortBy === 'oldest' ? 'primary' : 'secondary'"
            size="xs"
            @click="sortBy = 'oldest'"
          >
            En retard
          </AppButton>
        </div>
        
        <span class="text-sm text-neutral-500 w-full sm:w-auto">
          {{ totalReports }} signalement{{ totalReports > 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Bulk Actions -->
      <div v-if="selectedReportIds.length > 0" class="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-ds-lg px-4 py-3">
        <span class="text-sm font-medium text-blue-900">
          {{ selectedReportIds.length }} signalement{{ selectedReportIds.length > 1 ? 's sélectionnés' : ' sélectionné' }}
        </span>
        <AppButton
          variant="danger"
          size="xs"
          icon="Trash2"
          @click="openBulkDeleteModal"
        >
          Supprimer la sélection
        </AppButton>
      </div>

      <!-- Table with AppTable -->
      <AppTable
        ref="tableRef"
        :columns="tableColumns"
        :data="filteredReports"
        row-key="id"
        :selectable="true"
        :highlight-row="(row) => newReportIds.has(row.id)"
        @row-click="openSlideOver"
        @selection-change="handleSelectionChange"
      >
        <template #cell-title="{ row }">
          <div class="flex items-center gap-2.5">
            <CategoryIcon :category="row.category" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="font-medium text-dark truncate max-w-[200px]">{{ row.title }}</p>
                <span
                  v-if="row.ai_assisted"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex-shrink-0"
                  title="Signalement créé avec l'aide de l'IA"
                >
                  ✨ IA
                </span>
              </div>
              <p class="text-xs text-neutral-400 truncate max-w-[200px]">{{ row.address_approx || '—' }}</p>
            </div>
          </div>
        </template>

        <template #cell-category="{ row }">
          <span class="text-neutral-600">{{ getCategoryLabel(row.category) }}</span>
        </template>

        <template #cell-status="{ row }">
          <StatusBadge :status="row.status" />
        </template>

        <template #cell-vote_count="{ row }">
          <div class="flex items-center justify-center gap-2">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              <span>▲</span>
              <span>{{ row.vote_count || 0 }}</span>
            </div>
            <span
              v-if="(row.vote_count || 0) >= 5"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold"
            >
              🔥 Populaire
            </span>
          </div>
        </template>

        <template #cell-created_at="{ row }">
          <span class="text-neutral-500">{{ formatDate(row.created_at) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-2" data-no-row-click>
            <!-- <AppButton
              v-if="row.status === 'en_attente'"
              variant="warning"
              size="xs"
              :disabled="actionLoading"
              @click="updateStatus(row.id, 'pris_en_charge')"
            >
              Prendre en charge
            </AppButton> -->
            <!-- <AppButton
              v-if="row.status === 'pris_en_charge'"
              variant="success"
              size="xs"
              :disabled="actionLoading"
              @click="updateStatus(row.id, 'resolu')"
            >
              Marquer résolu
            </AppButton> -->
            <span
              v-if="row.status === 'resolu'"
              class="text-xs text-neutral-400"
            >
              Terminé
            </span>
            
            <!-- More Actions Button -->
            <AppButton
              variant="ghost"
              size="xs"
              icon="MoreVertical"
              :actions="getRowActions(row)"
            />
          </div>
        </template>

        <template #footer>
          <!-- Pagination -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-neutral-200">
            <div class="text-xs sm:text-sm text-neutral-500 text-center sm:text-left">
              Page {{ currentPage }} sur {{ totalPages }}<span class="hidden sm:inline"> —</span><br class="sm:hidden" /> {{ totalReports }} signalement{{ totalReports > 1 ? 's' : '' }} au total
            </div>
            <div class="flex items-center gap-1 sm:gap-2">
              <AppButton
                variant="secondary"
                size="xs"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                <span class="hidden sm:inline">Précédent</span>
                <span class="sm:hidden">←</span>
              </AppButton>
              
              <div class="flex items-center gap-1">
                <AppButton
                  v-for="page in getPageNumbers()"
                  :key="page"
                  :variant="page === currentPage ? 'primary' : 'secondary'"
                  size="xs"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </AppButton>
              </div>

              <AppButton
                variant="secondary"
                size="xs"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                <span class="hidden sm:inline">Suivant</span>
                <span class="sm:hidden">→</span>
              </AppButton>
            </div>
          </div>
        </template>
      </AppTable>
    </template>

    <!-- Delete Confirmation Modal -->
    <AppModal
      :open="deleteModalOpen"
      title="Supprimer le signalement"
      :description="`Êtes-vous sûr de vouloir supprimer le signalement '${reportToDelete?.title}' ? Cette action est irréversible.`"
      confirm-text="Supprimer"
      cancel-text="Annuler"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteModalOpen = false"
      @close="deleteModalOpen = false"
    />

    <!-- Bulk Delete Confirmation Modal -->
    <AppModal
      :open="bulkDeleteModalOpen"
      title="Supprimer les signalements"
      :description="`Êtes-vous sûr de vouloir supprimer ${selectedReportIds.length} signalement${selectedReportIds.length > 1 ? 's' : ''} ? Cette action est irréversible.`"
      confirm-text="Supprimer tout"
      cancel-text="Annuler"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmBulkDelete"
      @cancel="bulkDeleteModalOpen = false"
      @close="bulkDeleteModalOpen = false"
    />

    <!-- Report Detail Sidebar -->
    <ReportDetailSidebar
      :open="slideOverOpen"
      :report="selectedReport"
      :loading="actionLoading"
      @close="closeSlideOver"
      @update-status="updateStatus"
    />
  </div>
</template>
