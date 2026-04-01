<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useApi } from '@/composables/useApi'
import type { Report } from '@/types'
import ReportCard from '@/components/ReportCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'

const { apiFetch } = useApi()

const reports = ref<Report[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    reports.value = await apiFetch<Report[]>('/api/reports/mine', {
      cache: { maxAge: 60_000 }
    })
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-display font-bold text-dark">Mes signalements</h1>
        <p class="text-sm text-neutral-500 mt-1">Suivez l'avancement de vos signalements</p>
      </div>
      <RouterLink
        to="/signaler"
        class="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-ds hover:bg-primary-600 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nouveau
      </RouterLink>
    </div>

    <LoadingSpinner v-if="loading" />

    <p v-else-if="error" class="text-sm text-red-600 bg-red-50 rounded-ds px-4 py-3">
      {{ error }}
    </p>

    <EmptyState
      v-else-if="reports.length === 0"
      message="Vous n'avez pas encore fait de signalement."
      icon="📝"
    >
      <RouterLink
        to="/signaler"
        class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        Faire mon premier signalement →
      </RouterLink>
    </EmptyState>

    <div v-else class="space-y-3">
      <ReportCard
        v-for="report in reports"
        :key="report.id"
        :report="report"
      />
    </div>
  </div>
</template>
