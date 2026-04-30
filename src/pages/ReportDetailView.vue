<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useApi } from '@/composables/useApi'
import type { Report, StatusHistoryEntry } from '@/types'
import { useTenantCategories } from '@/composables/useTenantCategories'
import StatusBadge from '@/components/StatusBadge.vue'
import StatusTimeline from '@/components/StatusTimeline.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import MapView from '@/components/MapView.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import VoteButton from '@/components/VoteButton.vue'
import { useRealtimeReport } from '@/composables/useRealtimeReport'
import ReportComments from '@/components/report/ReportComments.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const { apiFetch, invalidateCache } = useApi()
const authStore = useAuthStore()

const report = ref<Report | null>(null)
const history = ref<StatusHistoryEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const hasVoted = ref(false)
const reportId = ref<string>('')

const { getCategoryLabel } = useTenantCategories()

const formattedDate = computed(() => {
  if (!report.value) return ''
  return new Date(report.value.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

onMounted(async () => {
  try {
    const id = route.params.id as string
    reportId.value = id
    
    const data = await apiFetch<{ report: Report; history: StatusHistoryEntry[] }>(
      `/api/reports/${id}`
    )
    report.value = data.report
    history.value = data.history

    const voteData = await apiFetch<{ has_voted: boolean }>(
      `/api/reports/${id}/my-vote`
    )
    hasVoted.value = voteData.has_voted
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

watch(reportId, (id) => {
  if (id) {
    useRealtimeReport(id, {
      onStatusChange: (newStatus) => {
        invalidateCache(`/api/reports/${id}`)
        
        if (report.value) {
          report.value.status = newStatus as any
        }
      },
      onVoteChange: (newCount) => {
        invalidateCache(`/api/reports/${id}`)
        
        if (report.value) {
          report.value.vote_count = newCount
        }
      },
    })
  }
}, { immediate: true })
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6">
    <RouterLink
      to="/mes-signalements"
      class="text-sm text-primary font-medium hover:underline mb-6 inline-flex items-center gap-1"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Retour à mes signalements
    </RouterLink>

    <LoadingSpinner v-if="loading" />

    <p v-else-if="error" class="text-sm text-red-600 bg-red-50 rounded-ds px-4 py-3">
      {{ error }}
    </p>

    <div v-else-if="report" class="space-y-6">
      <!-- Photo -->
      <div v-if="report.photo_url" class="rounded-ds-xl overflow-hidden border border-neutral-200">
        <img
          :src="report.photo_url"
          :alt="report.title"
          class="w-full h-64 sm:h-80 object-cover"
        />
      </div>

      <!-- Header -->
      <div class="bg-white rounded-ds-xl border border-neutral-200 p-6">
        <div class="flex items-start gap-4">
          <CategoryIcon :category="report.category" size="lg" />
          <div class="flex-1">
            <h1 class="text-lg font-display font-bold text-dark line-clamp-2">{{ report.title }}</h1>
            <StatusBadge :status="report.status" class="mt-2 self-start" />
            <p class="text-sm text-neutral-500 mt-2">
              {{ report ? getCategoryLabel(report.category) : '' }}
              <template v-if="report.address_approx"> — {{ report.address_approx }}</template>
            </p>
            <p class="text-xs text-neutral-400 mt-1">Signalé le {{ formattedDate }}</p>
          </div>
        </div>

        <p v-if="report.description" class="text-sm text-neutral-600 mt-4 leading-relaxed">
          {{ report.description }}
        </p>

        <div class="mt-6 pt-6 border-t border-neutral-200">
          <VoteButton
            :report-id="report.id"
            :initial-count="report.vote_count || 0"
            :initial-has-voted="hasVoted"
          />
        </div>
      </div>

      <!-- Timeline -->
      <div class="bg-white rounded-ds-xl border border-neutral-200 p-6">
        <h2 class="text-sm font-semibold text-dark mb-4">Suivi du signalement</h2>
        <StatusTimeline :current-status="report.status" :history="history" />
      </div>

      <!-- Messages (uniquement si citoyen connecté et auteur) -->
      <div
        v-if="authStore.isAuthenticated
              && report.user_id === authStore.user?.id"
        class="bg-white rounded-ds-xl border border-neutral-200 p-6"
      >
        <ReportComments
          :report-id="report.id"
          :report-status="report.status"
          :report-photo-url="report.photo_url"
          mode="citizen"
        />
      </div>

      <!-- Mini map -->
      <div class="bg-white rounded-ds-xl border border-neutral-200 p-6">
        <h2 class="text-sm font-semibold text-dark mb-4">Localisation</h2>
        <div class="h-[250px] rounded-ds-lg overflow-hidden border border-neutral-200">
          <MapView
            :center="[report.lat, report.lng]"
            :zoom="16"
            :selected-position="{ lat: report.lat, lng: report.lng, category: report.category }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
