<script setup lang="ts">
import { ref } from 'vue'
import VoteButton from './VoteButton.vue'
import { useAuthStore } from '@/stores/auth'
import CategoryAvatar from '@/components/CategoryAvatar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useReportStatuses } from '@/composables/useReportStatuses'

interface DuplicateReport {
  id: string
  title: string
  category: string
  description: string
  photo_url: string | null
  vote_count: number
  status: string
  distance_meters: number
  similarity_score: 'fort' | 'moyen' | 'faible'
  created_at: string
}

interface Props {
  duplicates: DuplicateReport[]
}

interface Emits {
  (e: 'continue'): void
  (e: 'voted', reportId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const votedReports = ref<Set<string>>(new Set())
const { getCategoryLabel, getCategoryIcon } = useTenantCategories()
const { getStatusConfig } = useReportStatuses()
const authStore = useAuthStore()

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
  return `Il y a ${Math.floor(diffDays / 30)} mois`
}

function handleVoted(reportId: string) {
  votedReports.value.add(reportId)
  emit('voted', reportId)
}

function handleContinue() {
  emit('continue')
}
</script>

<template>
  <div class="bg-amber-50 border-2 border-amber-300 rounded-lg p-6 space-y-4">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
        <AppIcon name="TriangleAlert" :size="24" class="text-amber-600" />
      </div>
      
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-amber-900 mb-1">
          {{ duplicates.length > 1 ? 'Des signalements similaires existent déjà' : 'Un signalement similaire existe déjà' }}
        </h3>
        <p class="text-sm text-amber-800">
          {{ duplicates.length > 1 ? 'Plusieurs signalements ont' : 'Un signalement a' }} été trouvé{{ duplicates.length > 1 ? 's' : '' }} à proximité.
          Soutenez {{ duplicates.length > 1 ? 'l\'un d\'entre eux' : 'ce signalement' }} pour augmenter sa priorité.
        </p>
      </div>
    </div>

    <div class="space-y-3">
      <div
        v-for="report in duplicates"
        :key="report.id"
        class="bg-white border border-amber-200 rounded-lg p-4 space-y-3"
      >
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-neutral-200">
            <img
              v-if="report.photo_url"
              :src="report.photo_url"
              :alt="report.title"
              class="w-full h-full object-cover"
            />
            <CategoryAvatar
              v-else
              :category="report.category"
              class="w-full h-full"
            />
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2 mb-1">
              <h4 class="font-semibold text-gray-900 truncate">
                {{ report.title }}
              </h4>
              <span
                v-if="report.similarity_score === 'fort'"
                class="flex-shrink-0 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded"
              >
                Très similaire
              </span>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
              <span class="inline-flex items-center gap-1">
                <AppIcon name="Tag" :size="16" />
                {{ getCategoryIcon(report.category) }} {{ getCategoryLabel(report.category) }}
              </span>

              <span class="text-gray-400">•</span>

              <span class="inline-flex items-center gap-1">
                <AppIcon name="MapPin" :size="16" />
                {{ formatDistance(report.distance_meters) }}
              </span>
              
              <span class="text-gray-400">•</span>
              
              <span>{{ formatDate(report.created_at) }}</span>
            </div>
            
            <p class="text-sm text-gray-700 line-clamp-2 mb-2">
              {{ report.description }}
            </p>
            
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                :class="{
                  'bg-yellow-100 text-yellow-800': report.status === 'en_attente',
                  'bg-blue-100 text-blue-800': report.status === 'pris_en_charge',
                  'bg-green-100 text-green-800': report.status === 'resolu',
                }"
              >
                {{ getStatusConfig(report.status).label }}
              </span>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-100">
          <VoteButton
            v-if="!votedReports.has(report.id)"
            :report-id="report.id"
            :initial-count="report.vote_count"
            :initial-has-voted="false"
            :is-authenticated="authStore.isAuthenticated"
            @click="handleVoted(report.id)"
          />
          <div
            v-else
            class="bg-green-50 border border-green-200 rounded-lg p-3 text-center"
          >
            <p class="text-sm font-medium text-green-800 mb-1">
              ✓ Votre soutien a été enregistré !
            </p>
            <p class="text-xs text-green-700">
              Ce signalement a maintenant {{ report.vote_count + 1 }} vote{{ report.vote_count + 1 > 1 ? 's' : '' }}.
              Les agents verront qu'il est prioritaire.
            </p>
            <a
              :href="`/signalement/${report.id}`"
              class="inline-block mt-2 text-sm text-green-700 hover:text-green-800 underline"
            >
              Voir ce signalement →
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-4 border-t border-amber-200">
      <button
        @click="handleContinue"
        class="w-full px-4 py-3 bg-white border-2 border-amber-600 text-amber-700 font-medium rounded-lg hover:bg-amber-50 transition-colors"
      >
        Ce n'est pas le même problème → Continuer et créer un nouveau signalement
      </button>
    </div>
  </div>
</template>
